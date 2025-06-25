import fs from "fs";
import path from "path";
import os from "os";
import { execSync, spawn } from "child_process";
import { fileURLToPath } from "url";
import { Complexity } from "eslintcc";
import { glob } from "glob";

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load configuration
const config = JSON.parse(
  fs.readFileSync(path.join(__dirname, "analysis-config.json"), "utf8"),
);

class AnalysisRunner {
  constructor() {
    this.reportDir = config.output.directory;
    this.results = {
      timestamp: new Date().toISOString(),
      project: config.project,
      tools: {
        eslint: null,
        prettier: null,
        jest: null,
        rust: null,
      },
      summary: {},
    };
  }

  async run() {
    console.log("🔍 Starting code analysis...\n");

    // Create reports directory
    this.ensureDirectory(this.reportDir);

    // Run all analysis tools
    await this.runESLintAnalysis();
    await this.runRustAnalysis();
    await this.runCoverageAnalysis();
    await this.runAdvancedMetricsAnalysis();

    // Generate unified report
    await this.generateUnifiedReport();

    console.log(
      `\n✅ Analysis complete! Reports available at: ${path.resolve(this.reportDir)}`,
    );
    console.log(
      `📊 Open ${path.resolve(this.reportDir, config.output.combinedReport)} to view the unified report`,
    );
  }

  ensureDirectory(dir) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  async ensureTestDatabase() {
    const testDbPath = path.join("src-tauri", "TESTDB.duckdb");

    if (fs.existsSync(testDbPath)) {
      console.log("  ✅ Test database already exists");
      return;
    }

    console.log("  📥 Downloading test database...");
    try {
      const url =
        "https://github.com/Benjamin1260/tulipa_output/releases/download/output/Norse_out.duckdb";

      // Use curl to download the file (similar to CI/CD)
      execSync(`curl -L "${url}" -o "${testDbPath}"`, {
        stdio: "pipe",
        timeout: 60000, // 60 second timeout
      });

      if (fs.existsSync(testDbPath)) {
        const stats = fs.statSync(testDbPath);
        console.log(
          `  ✅ Test database downloaded successfully (${Math.round((stats.size / 1024 / 1024) * 100) / 100} MB)`,
        );
      } else {
        throw new Error("Download completed but file not found");
      }
    } catch (error) {
      console.log(`  ⚠️ Failed to download test database: ${error.message}`);
      console.log("  Rust tests may fail without the test database");
      throw error;
    }
  }

  async runESLintAnalysis() {
    console.log("📋 Running ESLint analysis...");
    try {
      const eslintDir = path.join(this.reportDir, "eslint");
      this.ensureDirectory(eslintDir);

      // Run ESLint with HTML formatter
      const htmlOutput = path.join(eslintDir, "report.html");
      const jsonOutput = path.join(eslintDir, "report.json");

      try {
        execSync(
          `npx eslint src -c code-analysis/eslint.config.js -f html -o ${htmlOutput}`,
          { stdio: "inherit" },
        );
        execSync(
          `npx eslint src -c code-analysis/eslint.config.js -f json -o ${jsonOutput}`,
          { stdio: "inherit" },
        );

        // Parse results
        const eslintResults = JSON.parse(fs.readFileSync(jsonOutput, "utf8"));
        this.results.tools.eslint = {
          status: "success",
          files: eslintResults.length,
          errors: eslintResults.reduce((sum, file) => sum + file.errorCount, 0),
          warnings: eslintResults.reduce(
            (sum, file) => sum + file.warningCount,
            0,
          ),
          reportPath: path.join("eslint", "report.html"),
        };
      } catch (error) {
        // ESLint might exit with non-zero code due to linting issues, but still generate reports
        // Try to generate JSON report separately with --no-error-on-unmatched-pattern
        try {
          execSync(
            `npx eslint src --ext .ts,.tsx,.js,.jsx -f json -o ${jsonOutput} --no-error-on-unmatched-pattern`,
            { stdio: "pipe" },
          );
        } catch (jsonError) {
          // If JSON generation also fails, try without stdio redirect
          try {
            const jsonResult = execSync(
              `npx eslint src --ext .ts,.tsx,.js,.jsx -f json`,
              { encoding: "utf8", stdio: "pipe" },
            );
            fs.writeFileSync(jsonOutput, jsonResult);
          } catch (finalError) {
            // If all else fails, we'll just use the HTML report
          }
        }

        if (fs.existsSync(htmlOutput)) {
          let eslintData = {
            status: "completed_with_issues",
            reportPath: path.join("eslint", "report.html"),
          };

          // Try to parse JSON results if available
          if (fs.existsSync(jsonOutput)) {
            try {
              const eslintResults = JSON.parse(
                fs.readFileSync(jsonOutput, "utf8"),
              );
              eslintData = {
                ...eslintData,
                files: eslintResults.length,
                errors: eslintResults.reduce(
                  (sum, file) => sum + file.errorCount,
                  0,
                ),
                warnings: eslintResults.reduce(
                  (sum, file) => sum + file.warningCount,
                  0,
                ),
              };
            } catch (parseError) {
              console.log(
                "  Could not parse ESLint JSON results, but HTML report is available",
              );
            }
          }

          this.results.tools.eslint = eslintData;
        } else {
          throw error;
        }
      }

      console.log("✅ ESLint analysis completed");
    } catch (error) {
      console.error("❌ ESLint analysis failed:", error.message);
      this.results.tools.eslint = { status: "failed", error: error.message };
    }
  }

  async runRustAnalysis() {
    console.log("🦀 Running Rust analysis...");
    try {
      const rustDir = path.join(this.reportDir, "rust");
      this.ensureDirectory(rustDir);

      let clippyData = null;
      let tokeiData = null;

      // Run Clippy
      console.log("  Running Clippy...");
      try {
        const clippyOutput = execSync(
          "cargo clippy --manifest-path src-tauri/Cargo.toml --message-format=json",
          {
            encoding: "utf8",
            cwd: process.cwd(),
          },
        );
        fs.writeFileSync(path.join(rustDir, "clippy.json"), clippyOutput);

        // Parse Clippy results
        const clippyLines = clippyOutput
          .trim()
          .split("\n")
          .filter((line) => line.trim());
        const clippyMessages = clippyLines
          .map((line) => {
            try {
              return JSON.parse(line);
            } catch {
              return null;
            }
          })
          .filter((item) => item && item.message && item.message.level);

        clippyData = {
          total: clippyMessages.length,
          errors: clippyMessages.filter((m) => m.message.level === "error")
            .length,
          warnings: clippyMessages.filter((m) => m.message.level === "warning")
            .length,
          messages: clippyMessages,
        };
      } catch (clippyError) {
        console.log("  Clippy analysis failed:", clippyError.message);
      }

      // Run Tokei for code statistics
      try {
        console.log("  Running Tokei...");
        const tokeiPath = process.env.HOME + "/.cargo/bin/tokei";
        const tokeiCommand = fs.existsSync(tokeiPath) ? tokeiPath : "tokei";
        const tokeiOutput = execSync(
          `${tokeiCommand} src-tauri/src --output json`,
          { encoding: "utf8" },
        );
        fs.writeFileSync(path.join(rustDir, "tokei.json"), tokeiOutput);
        tokeiData = JSON.parse(tokeiOutput);
      } catch (tokeiError) {
        console.log("  Tokei not installed, skipping...");
      }

      // Generate HTML report
      const htmlReport = this.generateRustHTML(clippyData, tokeiData);
      const reportPath = path.join(rustDir, "index.html");
      fs.writeFileSync(reportPath, htmlReport);

      this.results.tools.rust = {
        status: "success",
        reportPath: path.join("rust", "index.html"),
      };

      console.log("✅ Rust analysis completed");
    } catch (error) {
      console.error("❌ Rust analysis failed:", error.message);
      this.results.tools.rust = { status: "failed", error: error.message };
    }
  }

  async runCoverageAnalysis() {
    console.log("📊 Running coverage analysis...");
    try {
      const coverageResults = {};
      const coverageDir = path.join(this.reportDir, "coverage");
      this.ensureDirectory(coverageDir);

      // Frontend coverage
      console.log("  Running Frontend coverage...");
      try {
        // Clean previous coverage reports
        execSync("npm run test:coverage:clean", { stdio: "pipe" });

        // Run frontend tests with coverage
        execSync("npm run test:coverage", { stdio: "inherit" });

        // Check if frontend coverage files exist
        const frontendCoverageFiles = [
          "coverage/index.html",
          "coverage/coverage-final.json",
          "coverage/cobertura-coverage.xml",
          "coverage/coverage-summary.json",
        ];

        const existingFiles = frontendCoverageFiles.filter((file) =>
          fs.existsSync(file),
        );

        if (existingFiles.length > 0) {
          // Copy coverage reports to our analysis directory
          const frontendCoverageDir = path.join(coverageDir, "frontend");
          this.ensureDirectory(frontendCoverageDir);

          // Copy HTML report
          if (fs.existsSync("coverage")) {
            // Copy entire coverage directory
            execSync(`cp -r coverage/* ${frontendCoverageDir}/`, {
              stdio: "pipe",
            });
          }

          // Parse coverage summary for metrics
          let coverageMetrics = null;
          if (fs.existsSync("coverage/coverage-summary.json")) {
            const summary = JSON.parse(
              fs.readFileSync("coverage/coverage-summary.json", "utf8"),
            );
            coverageMetrics = {
              lines: summary.total?.lines || { pct: 0 },
              statements: summary.total?.statements || { pct: 0 },
              functions: summary.total?.functions || { pct: 0 },
              branches: summary.total?.branches || { pct: 0 },
            };
          }

          coverageResults.frontend = {
            status: "success",
            reportPath: path.join("coverage", "frontend", "index.html"),
            xmlReportPath: path.join(
              "coverage",
              "frontend",
              "cobertura-coverage.xml",
            ),
            jsonReportPath: path.join(
              "coverage",
              "frontend",
              "coverage-final.json",
            ),
            metrics: coverageMetrics,
            files: existingFiles.map((f) => path.basename(f)),
          };
          console.log("  ✅ Frontend coverage completed");

          if (coverageMetrics) {
            console.log(
              `    📊 Coverage: Lines ${coverageMetrics.lines.pct}%, Statements ${coverageMetrics.statements.pct}%, Functions ${coverageMetrics.functions.pct}%, Branches ${coverageMetrics.branches.pct}%`,
            );
          }
        } else {
          coverageResults.frontend = {
            status: "no_report",
            message: "Frontend tests completed but no coverage reports found",
          };
        }
      } catch (frontendError) {
        console.log("  ⚠️ Frontend coverage failed:", frontendError.message);
        coverageResults.frontend = {
          status: "failed",
          error: frontendError.message,
        };
      }

      // Rust coverage
      console.log("  Running Rust coverage...");
      try {
        // Ensure test database exists before running Rust tests
        await this.ensureTestDatabase();

        execSync("npm run tauri:test", { stdio: "inherit" });

        // Check if Rust coverage file exists
        if (fs.existsSync("cargo-coverage.xml")) {
          // Copy to coverage directory
          const rustCoverageDir = path.join(coverageDir, "rust");
          this.ensureDirectory(rustCoverageDir);
          execSync(`cp cargo-coverage.xml ${rustCoverageDir}/`, {
            stdio: "pipe",
          });

          // Parse Cobertura XML for metrics
          console.log("  📊 Parsing Rust coverage metrics...");
          const rustMetrics = this.parseCoberturaXML("cargo-coverage.xml");

          coverageResults.rust = {
            status: "success",
            reportPath: path.join("coverage", "rust", "cargo-coverage.xml"),
            originalPath: "cargo-coverage.xml",
            metrics: rustMetrics,
          };
          console.log("  ✅ Rust coverage completed");

          if (rustMetrics) {
            console.log(
              `    📊 Rust Coverage: Lines ${rustMetrics.lineRate}%, Branches ${rustMetrics.branchRate}%`,
            );
          }
        } else {
          coverageResults.rust = {
            status: "no_report",
            message: "Rust coverage completed but no XML report found",
          };
        }
      } catch (rustError) {
        console.log("  ⚠️ Rust coverage failed:", rustError.message);
        coverageResults.rust = {
          status: "failed",
          error: rustError.message,
        };
      }

      // Generate combined coverage report
      console.log("  Generating combined coverage report...");
      try {
        const combinedReportPath =
          await this.generateCombinedCoverageReport(coverageResults);

        this.results.tools.coverage = {
          status: "success",
          frontend: coverageResults.frontend,
          rust: coverageResults.rust,
          combinedReportPath: combinedReportPath,
        };
      } catch (reportError) {
        console.log(
          "  ⚠️ Combined report generation failed:",
          reportError.message,
        );
        this.results.tools.coverage = {
          status: "partial_success",
          frontend: coverageResults.frontend,
          rust: coverageResults.rust,
          error: `Combined report failed: ${reportError.message}`,
        };
      }

      console.log("✅ Coverage analysis completed");
    } catch (error) {
      console.error("❌ Coverage analysis failed:", error.message);
      this.results.tools.coverage = { status: "failed", error: error.message };
    }
  }

  parseCoberturaXML(xmlFilePath) {
    try {
      if (!fs.existsSync(xmlFilePath)) {
        console.log(
          `    Warning: Cobertura XML file not found: ${xmlFilePath}`,
        );
        return null;
      }

      const xmlContent = fs.readFileSync(xmlFilePath, "utf8");

      // Parse coverage tag attributes for overall statistics
      const coverageMatch = xmlContent.match(/<coverage[^>]*>/);
      if (!coverageMatch) {
        console.log("    Warning: Could not find coverage tag in XML");
        return null;
      }

      const coverageTag = coverageMatch[0];

      // Extract line-rate and branch-rate attributes
      const lineRateMatch = coverageTag.match(/line-rate="([^"]+)"/);
      const branchRateMatch = coverageTag.match(/branch-rate="([^"]+)"/);
      const linesValidMatch = coverageTag.match(/lines-valid="([^"]+)"/);
      const linesCoveredMatch = coverageTag.match(/lines-covered="([^"]+)"/);
      const branchesValidMatch = coverageTag.match(/branches-valid="([^"]+)"/);
      const branchesCoveredMatch = coverageTag.match(
        /branches-covered="([^"]+)"/,
      );

      const lineRate = lineRateMatch ? parseFloat(lineRateMatch[1]) * 100 : 0;
      const branchRate = branchRateMatch
        ? parseFloat(branchRateMatch[1]) * 100
        : 0;
      const linesValid = linesValidMatch ? parseInt(linesValidMatch[1]) : 0;
      const linesCovered = linesCoveredMatch
        ? parseInt(linesCoveredMatch[1])
        : 0;
      const branchesValid = branchesValidMatch
        ? parseInt(branchesValidMatch[1])
        : 0;
      const branchesCovered = branchesCoveredMatch
        ? parseInt(branchesCoveredMatch[1])
        : 0;

      // Count packages and classes for additional context
      const packageMatches = xmlContent.match(/<package[^>]*>/g) || [];
      const classMatches = xmlContent.match(/<class[^>]*>/g) || [];

      return {
        lineRate: Math.round(lineRate * 100) / 100,
        branchRate: Math.round(branchRate * 100) / 100,
        linesValid,
        linesCovered,
        branchesValid,
        branchesCovered,
        packages: packageMatches.length,
        classes: classMatches.length,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.log(
        `    Warning: Failed to parse Cobertura XML: ${error.message}`,
      );
      return null;
    }
  }

  async runAdvancedMetricsAnalysis() {
    console.log(
      "📊 Running advanced metrics analysis (LCoM, Coupling, etc.)...",
    );
    try {
      const metricsDir = path.join(this.reportDir, "metrics");
      this.ensureDirectory(metricsDir);

      // Find all JavaScript and TypeScript files
      const filePatterns = [
        "src/**/*.ts",
        "src/**/*.tsx",
        "src/**/*.js",
        "src/**/*.jsx",
      ];

      const allFiles = [];
      for (const pattern of filePatterns) {
        const files = await glob(pattern, { absolute: true });
        allFiles.push(...files);
      }

      console.log(`  Found ${allFiles.length} files to analyze`);

      let totalComplexity = 0;
      let totalMaintainability = 0;
      let totalLCoM = 0;
      let totalFiles = 0;
      let totalCoupling = 0;
      let successfulAnalyses = 0;
      const fileMetrics = [];
      const complexityThreshold =
        config.thresholds?.complexity?.cyclomatic || 15;
      const maintainabilityThreshold =
        config.thresholds?.maintainability?.index || 60;

      // Initialize eslintcc complexity analyzer
      const complexity = new Complexity({
        rules: ["all"], // Use all complexity rules
        eslintOptions: {
          useEslintrc: false,
          overrideConfig: {
            parser: "@typescript-eslint/parser",
            parserOptions: {
              ecmaVersion: "latest",
              sourceType: "module",
              ecmaFeatures: {
                jsx: true,
              },
            },
            plugins: ["@typescript-eslint"],
            extends: ["eslint:recommended"],
          },
        },
      });

      // Analyze each file
      for (const filePath of allFiles) {
        try {
          const content = fs.readFileSync(filePath, "utf8");

          // Skip empty files or files with only imports/exports
          if (content.trim().length < 50) continue;

          const relativePath = path.relative(process.cwd(), filePath);
          let fileMetric = null;

          try {
            // Use eslintcc for complexity analysis
            const report = await complexity.lintFiles([filePath]);

            if (report && report.files && report.files.length > 0) {
              const fileReport = report.files[0];

              // Calculate metrics from eslintcc report
              let fileComplexity = 0;
              let fileMaintainability = 100; // Start with perfect score
              let functionCount = 0;

              const functions = [];

              if (fileReport.messages && fileReport.messages.length > 0) {
                for (const message of fileReport.messages) {
                  if (message.type === "function") {
                    functionCount++;
                    const funcComplexity = this.calculateFunctionComplexity(
                      message.rules,
                    );
                    fileComplexity += funcComplexity;

                    functions.push({
                      name: message.name || "anonymous",
                      complexity: funcComplexity,
                      sloc: this.estimateSloc(message),
                      params: this.extractParamCount(message.name || ""),
                    });
                  }
                }
              }

              // If no functions detected, use basic analysis
              if (functionCount === 0) {
                fileComplexity = this.calculateBasicComplexity(content);
                functions.push(...this.extractBasicFunctions(content));
              }

              // Calculate maintainability index based on complexity and file size
              const sloc = this.countLogicalLines(content);
              fileMaintainability = this.calculateMaintainabilityIndex(
                fileComplexity,
                sloc,
                functions.length,
              );

              fileMetric = {
                file: relativePath,
                complexity: {
                  cyclomatic: fileComplexity,
                  sloc: sloc,
                  halstead: this.calculateBasicHalstead(content),
                  maintainability: fileMaintainability,
                },
                functions: functions,
                dependencies: this.extractDependencies(content),
                lcom: this.calculateBasicLCoM(content),
                coupling: this.calculateCoupling(content, allFiles),
                analysisMethod: "eslintcc",
              };
              successfulAnalyses++;
            } else {
              throw new Error("No valid eslintcc report generated");
            }
          } catch (eslintccError) {
            console.log(
              `    Note: ESLintCC analysis failed for ${relativePath}, using fallback: ${eslintccError.message}`,
            );

            // Fallback to basic analysis for problematic files
            fileMetric = {
              file: relativePath,
              complexity: {
                cyclomatic: this.calculateBasicComplexity(content),
                sloc: this.countLogicalLines(content),
                halstead: this.calculateBasicHalstead(content),
                maintainability: this.calculateMaintainabilityIndex(
                  this.calculateBasicComplexity(content),
                  this.countLogicalLines(content),
                  this.extractBasicFunctions(content).length,
                ),
              },
              functions: this.extractBasicFunctions(content),
              dependencies: this.extractDependencies(content),
              lcom: this.calculateBasicLCoM(content),
              coupling: this.calculateCoupling(content, allFiles),
              analysisMethod: "basic",
              note: "ESLintCC analysis failed, using regex-based fallback",
            };
          }

          if (fileMetric) {
            fileMetrics.push(fileMetric);
            totalComplexity += fileMetric.complexity.cyclomatic;
            totalMaintainability += fileMetric.complexity.maintainability;
            totalLCoM += fileMetric.lcom;
            totalCoupling += fileMetric.coupling.efferent;
            totalFiles++;
          }
        } catch (fileError) {
          console.log(
            `    Warning: Could not analyze ${path.relative(process.cwd(), filePath)}: ${fileError.message}`,
          );
        }
      }

      // Calculate averages and summary statistics
      const avgComplexity = totalFiles > 0 ? totalComplexity / totalFiles : 0;
      const avgMaintainability =
        totalFiles > 0 ? totalMaintainability / totalFiles : 0;
      const avgLCoM = totalFiles > 0 ? totalLCoM / totalFiles : 0;
      const avgCoupling = totalFiles > 0 ? totalCoupling / totalFiles : 0;

      // Find problematic files
      const highComplexityFiles = fileMetrics.filter(
        (f) => f.complexity.cyclomatic > complexityThreshold,
      );
      const lowMaintainabilityFiles = fileMetrics.filter(
        (f) => f.complexity.maintainability < maintainabilityThreshold,
      );
      const highCouplingFiles = fileMetrics.filter(
        (f) => f.coupling.efferent > 10,
      );

      const summary = {
        totalFiles,
        successfulAnalyses,
        analysisRatio:
          totalFiles > 0
            ? ((successfulAnalyses / totalFiles) * 100).toFixed(1)
            : "0",
        averages: {
          complexity: Math.round(avgComplexity * 100) / 100,
          maintainability: Math.round(avgMaintainability * 100) / 100,
          lcom: Math.round(avgLCoM * 100) / 100,
          coupling: Math.round(avgCoupling * 100) / 100,
        },
        thresholds: {
          complexity: complexityThreshold,
          maintainability: maintainabilityThreshold,
        },
        issues: {
          highComplexity: highComplexityFiles.length,
          lowMaintainability: lowMaintainabilityFiles.length,
          highCoupling: highCouplingFiles.length,
        },
      };

      // Save detailed results
      const detailedReport = {
        summary,
        files: fileMetrics,
        problematicFiles: {
          highComplexity: highComplexityFiles.map((f) => ({
            file: f.file,
            complexity: f.complexity.cyclomatic,
          })),
          lowMaintainability: lowMaintainabilityFiles.map((f) => ({
            file: f.file,
            maintainability: f.complexity.maintainability,
          })),
          highCoupling: highCouplingFiles.map((f) => ({
            file: f.file,
            coupling: f.coupling.efferent,
          })),
        },
      };

      fs.writeFileSync(
        path.join(metricsDir, "detailed-metrics.json"),
        JSON.stringify(detailedReport, null, 2),
      );

      // Generate HTML report
      const htmlReport = this.generateAdvancedMetricsHTML(detailedReport);
      const reportPath = path.join(metricsDir, "index.html");
      fs.writeFileSync(reportPath, htmlReport);

      this.results.tools.advancedMetrics = {
        status: "success",
        reportPath: path.join("metrics", "index.html"),
        summary,
      };

      console.log(
        `✅ Advanced metrics analysis completed (analyzed ${totalFiles} files, ${successfulAnalyses} with ESLintCC metrics)`,
      );
    } catch (error) {
      console.error("❌ Advanced metrics analysis failed:", error.message);
      this.results.tools.advancedMetrics = {
        status: "failed",
        error: error.message,
      };
    }
  }

  extractDependencies(content) {
    const dependencies = [];
    const importRegex = /import\s+(?:.+\s+from\s+)?['"]([^'"]+)['"]/g;
    const requireRegex = /require\(['"]([^'"]+)['"]\)/g;

    let match;
    while ((match = importRegex.exec(content)) !== null) {
      if (!match[1].startsWith(".")) {
        // External dependency
        dependencies.push(match[1]);
      }
    }

    while ((match = requireRegex.exec(content)) !== null) {
      if (!match[1].startsWith(".")) {
        // External dependency
        dependencies.push(match[1]);
      }
    }

    return [...new Set(dependencies)]; // Remove duplicates
  }

  calculateBasicComplexity(content) {
    // Basic complexity calculation by counting decision points
    const complexityKeywords = [
      "if",
      "else",
      "for",
      "while",
      "switch",
      "case",
      "catch",
      "&&",
      "||",
    ];
    const ternaryPattern = /\?[^:]*:/g; // Ternary operators
    let complexity = 1; // Base complexity

    for (const keyword of complexityKeywords) {
      const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(`\\b${escapedKeyword}\\b`, "g");
      const matches = content.match(regex);
      if (matches) {
        complexity += matches.length;
      }
    }

    // Count ternary operators separately
    const ternaryMatches = content.match(ternaryPattern);
    if (ternaryMatches) {
      complexity += ternaryMatches.length;
    }

    return complexity;
  }

  countLogicalLines(content) {
    // Count non-empty, non-comment lines
    const lines = content.split("\n");
    let logicalLines = 0;

    for (const line of lines) {
      const trimmed = line.trim();
      if (
        trimmed &&
        !trimmed.startsWith("//") &&
        !trimmed.startsWith("/*") &&
        !trimmed.startsWith("*")
      ) {
        logicalLines++;
      }
    }

    return logicalLines;
  }

  extractBasicFunctions(content) {
    // Extract function declarations using regex
    const functions = [];
    const functionRegex =
      /(?:function\s+(\w+)|(\w+)\s*[:=]\s*(?:async\s+)?(?:function|\([^)]*\)\s*=>)|(?:async\s+)?(\w+)\s*\([^)]*\)\s*\{)/g;

    let match;
    while ((match = functionRegex.exec(content)) !== null) {
      const name = match[1] || match[2] || match[3] || "anonymous";
      functions.push({
        name: name,
        complexity: 1, // Default complexity
        sloc: 10, // Estimated lines
        params: 0, // Can't easily extract without parsing
      });
    }

    return functions;
  }

  calculateBasicLCoM(content) {
    // Basic LCoM approximation based on variable usage patterns
    const variables = this.extractVariables(content);
    const functions = this.extractBasicFunctions(content);

    if (functions.length <= 1 || variables.length <= 1) return 0;

    // Simplified heuristic: assume functions that use similar variable names are cohesive
    let cohesiveRelations = 0;
    let totalRelations = (functions.length * (functions.length - 1)) / 2;

    // Simple heuristic based on shared variable patterns
    for (let i = 0; i < functions.length; i++) {
      for (let j = i + 1; j < functions.length; j++) {
        // If function names are similar, assume they might share variables
        if (
          this.calculateStringSimilarity(functions[i].name, functions[j].name) >
          0.3
        ) {
          cohesiveRelations++;
        }
      }
    }

    return totalRelations > 0
      ? (totalRelations - cohesiveRelations) / totalRelations
      : 0;
  }

  extractVariables(content) {
    // Extract variable declarations
    const variables = [];
    const varRegex = /(?:let|const|var)\s+(\w+)/g;

    let match;
    while ((match = varRegex.exec(content)) !== null) {
      variables.push(match[1]);
    }

    return [...new Set(variables)];
  }

  calculateStringSimilarity(str1, str2) {
    // Simple string similarity calculation
    const len1 = str1.length;
    const len2 = str2.length;
    const maxLen = Math.max(len1, len2);

    if (maxLen === 0) return 1;

    let common = 0;
    for (let i = 0; i < Math.min(len1, len2); i++) {
      if (str1[i] === str2[i]) common++;
    }

    return common / maxLen;
  }

  calculateMaintainabilityIndex(complexity, sloc, functionCount) {
    // Calculate maintainability index based on Microsoft's formula (simplified)
    // MI = 171 - 5.2 * ln(avgVolume) - 0.23 * avgComplexity - 16.2 * ln(avgLOC)
    // Simplified version for our use case
    if (sloc === 0) return 100;

    const avgComplexity =
      functionCount > 0 ? complexity / functionCount : complexity;
    const complexityPenalty = avgComplexity * 2;
    const sizePenalty = Math.log(sloc) * 5;

    let maintainability = 100 - complexityPenalty - sizePenalty;

    // Ensure it's between 0 and 100
    return Math.max(0, Math.min(100, maintainability));
  }

  calculateBasicHalstead(content) {
    // Basic Halstead complexity metrics calculation
    const operators = [
      "=",
      "+",
      "-",
      "*",
      "/",
      "%",
      "==",
      "!=",
      "<",
      ">",
      "<=",
      ">=",
      "&&",
      "||",
      "!",
      "?",
      ":",
      "=>",
    ];
    const operatorRegex = new RegExp(
      `(${operators.map((op) => op.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`,
      "g",
    );
    const operandRegex = /\b[a-zA-Z_$][a-zA-Z0-9_$]*\b/g;

    const operatorMatches = content.match(operatorRegex) || [];
    const operandMatches = content.match(operandRegex) || [];

    const uniqueOperators = [...new Set(operatorMatches)].length;
    const uniqueOperands = [...new Set(operandMatches)].length;
    const totalOperators = operatorMatches.length;
    const totalOperands = operandMatches.length;

    const vocabulary = uniqueOperators + uniqueOperands;
    const length = totalOperators + totalOperands;

    return {
      vocabulary: vocabulary,
      length: length,
      difficulty:
        vocabulary > 0
          ? (uniqueOperators / 2) * (totalOperands / uniqueOperands)
          : 0,
      volume: length * Math.log2(vocabulary || 1),
      effort: 0, // Calculated from difficulty and volume
    };
  }

  calculateFunctionComplexity(rules) {
    // Extract complexity from eslintcc rules
    let complexity = 1; // Base complexity

    if (rules) {
      if (rules.complexity && rules.complexity.value) {
        complexity = rules.complexity.value;
      } else if (rules["max-depth"] && rules["max-depth"].value) {
        complexity += rules["max-depth"].value;
      } else if (rules["max-statements"] && rules["max-statements"].value) {
        complexity += Math.floor(rules["max-statements"].value / 5); // Normalize statements to complexity
      }
    }

    return complexity;
  }

  estimateSloc(message) {
    // Estimate source lines of code for a function
    if (message.loc && message.loc.start && message.loc.end) {
      return Math.max(1, message.loc.end.line - message.loc.start.line + 1);
    }
    return 10; // Default estimate
  }

  extractParamCount(functionName) {
    // Extract parameter count from function name/signature
    const paramMatch = functionName.match(/\(([^)]*)\)/);
    if (paramMatch && paramMatch[1].trim()) {
      return paramMatch[1].split(",").filter((p) => p.trim()).length;
    }
    return 0;
  }

  calculateCoupling(content, allFiles) {
    const dependencies = this.extractDependencies(content);
    const localImports = [];

    // Count relative imports (coupling to local modules)
    const localImportRegex = /import\s+(?:.+\s+from\s+)?['"](\.[^'"]+)['"]/g;
    let match;
    while ((match = localImportRegex.exec(content)) !== null) {
      localImports.push(match[1]);
    }

    return {
      efferent: dependencies.length + localImports.length, // Outgoing dependencies
      afferent: 0, // This would need cross-file analysis to calculate properly
      external: dependencies.length,
      internal: localImports.length,
    };
  }

  async generateUnifiedReport() {
    console.log("📄 Generating unified HTML report...");

    const htmlTemplate = this.getHTMLTemplate();
    const reportPath = path.join(this.reportDir, config.output.combinedReport);

    fs.writeFileSync(reportPath, htmlTemplate);

    // Also save JSON results
    fs.writeFileSync(
      path.join(this.reportDir, "results.json"),
      JSON.stringify(this.results, null, 2),
    );

    console.log("✅ Unified report generated");
  }

  getHTMLTemplate() {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Code Analysis Report - ${this.results.project.name}</title>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; }
        .header { background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); margin-bottom: 20px; }
        .tool-section { background: white; margin: 20px 0; padding: 25px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .status-success { color: #28a745; }
        .status-failed { color: #dc3545; }
        .status-skipped { color: #ffc107; }
        .status-completed_with_issues { color: #fd7e14; }
        .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; }
        .metric { background: #f8f9fa; padding: 15px; border-radius: 5px; border-left: 4px solid #007bff; }
        .btn { display: inline-block; padding: 10px 20px; background: #007bff; color: white; text-decoration: none; border-radius: 5px; margin: 5px; }
        .btn:hover { background: #0056b3; }
        .timestamp { color: #6c757d; font-size: 0.9em; }
        h1 { color: #343a40; margin: 0; }
        h2 { color: #495057; border-bottom: 2px solid #e9ecef; padding-bottom: 10px; }
        .summary-stats { display: flex; gap: 20px; margin: 20px 0; }
        .stat-card { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px; text-align: center; flex: 1; }
        .stat-number { font-size: 2em; font-weight: bold; }
        .stat-label { font-size: 0.9em; opacity: 0.9; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>${this.results.project.name}</h1>
            <p>${this.results.project.description}</p>
            <div class="timestamp">Report generated: ${new Date(this.results.timestamp).toLocaleString()}</div>
        </div>

        <div class="summary-stats">
            <div class="stat-card">
                <div class="stat-number">${Object.keys(this.results.tools).length}</div>
                <div class="stat-label">Analysis Tools</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${Object.values(this.results.tools).filter((t) => t && t.status === "success").length}</div>
                <div class="stat-label">Successful</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${Object.values(this.results.tools).filter((t) => t && t.status === "failed").length}</div>
                <div class="stat-label">Failed</div>
            </div>
        </div>

        ${Object.entries(this.results.tools || {})
          .filter(([_, result]) => result !== null)
          .map(([tool, result]) => this.generateToolSection(tool, result))
          .join("")}
        
        <div class="tool-section">
            <h2>📁 Report Files</h2>
            <p>All individual reports and data files are available in the analysis-reports directory:</p>
            <ul>
                <li><strong>ESLint:</strong> <a href="eslint/report.html">eslint/report.html</a></li>
                <li><strong>Rust Analysis:</strong> <a href="rust/index.html">rust/index.html</a></li>
                <li><strong>Advanced Metrics:</strong> <a href="metrics/index.html">metrics/index.html</a> - LCoM, Coupling, Complexity</li>
                <li><strong>Coverage Reports:</strong>
                    <ul>
                        <li><strong>Combined Coverage:</strong> <a href="coverage/index.html">coverage/index.html</a> - Frontend + Rust coverage overview</li>
                        <li><strong>Frontend Coverage:</strong> <a href="coverage/frontend/index.html">coverage/frontend/index.html</a> - Detailed frontend coverage (Vitest)</li>
                        <li><strong>Frontend XML:</strong> <a href="coverage/frontend/cobertura-coverage.xml">coverage/frontend/cobertura-coverage.xml</a> - CI/CD integration</li>
                        <li><strong>Rust Coverage:</strong> <a href="coverage/rust/cargo-coverage.xml">coverage/rust/cargo-coverage.xml</a> - Rust coverage (Cobertura XML)</li>
                        <li><strong>Legacy Rust:</strong> <a href="../cargo-coverage.xml" target="_blank">cargo-coverage.xml</a> - Original location</li>
                    </ul>
                </li>
                <li><strong>Raw Data:</strong> <a href="results.json">results.json</a></li>
            </ul>
        </div>
    </div>
</body>
</html>`;
  }

  generateRustHTML(clippyData, tokeiData) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Rust Analysis Report - ${this.results.project.name}</title>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; }
        .header { background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); margin-bottom: 20px; }
        .section { background: white; margin: 20px 0; padding: 25px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .status-success { color: #28a745; }
        .status-warning { color: #ffc107; }
        .status-error { color: #dc3545; }
        .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; }
        .metric { background: #f8f9fa; padding: 15px; border-radius: 5px; border-left: 4px solid #007bff; }
        h1 { color: #343a40; margin: 0; }
        h2 { color: #495057; border-bottom: 2px solid #e9ecef; padding-bottom: 10px; }
        .timestamp { color: #6c757d; font-size: 0.9em; }
        .stat-card { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px; text-align: center; flex: 1; }
        .stat-number { font-size: 2em; font-weight: bold; }
        .stat-label { font-size: 0.9em; opacity: 0.9; }
        .summary-stats { display: flex; gap: 20px; margin: 20px 0; }
        .message-item { background: #f8f9fa; margin: 5px 0; padding: 10px; border-radius: 5px; border-left: 4px solid #ffc107; }
        .error-item { border-left-color: #dc3545; }
        .warning-item { border-left-color: #ffc107; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Rust Analysis Report</h1>
            <p>${this.results.project.name}</p>
            <div class="timestamp">Report generated: ${new Date().toLocaleString()}</div>
        </div>

        <div class="summary-stats">
            <div class="stat-card">
                <div class="stat-number">${clippyData ? clippyData.errors : "N/A"}</div>
                <div class="stat-label">Clippy Errors</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${clippyData ? clippyData.warnings : "N/A"}</div>
                <div class="stat-label">Clippy Warnings</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${tokeiData && tokeiData.Rust ? tokeiData.Rust.code : "N/A"}</div>
                <div class="stat-label">Lines of Code</div>
            </div>
        </div>

        ${
          clippyData
            ? `
        <div class="section">
            <h2>🦀 Clippy Analysis</h2>
            <div class="grid">
                <div class="metric">
                    <strong>Total Messages:</strong> ${clippyData.total}
                </div>
                <div class="metric">
                    <strong>Errors:</strong> <span class="status-error">${clippyData.errors}</span>
                </div>
                <div class="metric">
                    <strong>Warnings:</strong> <span class="status-warning">${clippyData.warnings}</span>
                </div>
            </div>
            
            ${
              clippyData.messages.length > 0
                ? `
                <h3>Messages:</h3>
                ${clippyData.messages
                  .slice(0, 10)
                  .map(
                    (m) => `
                    <div class="message-item ${m.message.level === "error" ? "error-item" : "warning-item"}">
                        <strong>${m.message.level.toUpperCase()}:</strong> ${m.message.message}<br>
                        <small>File: ${m.target?.src_path || "Unknown"}</small>
                    </div>
                `,
                  )
                  .join("")}
                ${clippyData.messages.length > 10 ? `<p><em>... and ${clippyData.messages.length - 10} more messages</em></p>` : ""}
            `
                : '<p class="status-success">✅ No Clippy messages found!</p>'
            }
        </div>
        `
            : `
        <div class="section">
            <h2>🦀 Clippy Analysis</h2>
            <p>Clippy analysis not available</p>
        </div>
        `
        }

        ${
          tokeiData
            ? `
        <div class="section">
            <h2>📊 Code Statistics (Tokei)</h2>
            <div class="grid">
                ${Object.entries(tokeiData)
                  .filter(([lang, data]) => lang !== "Total")
                  .map(
                    ([lang, data]) => `
                    <div class="metric">
                        <strong>${lang}:</strong><br>
                        Code: ${data.code || 0}<br>
                        Comments: ${data.comments || 0}<br>
                        Blanks: ${data.blanks || 0}
                    </div>
                `,
                  )
                  .join("")}
                ${
                  tokeiData.Total
                    ? `
                    <div class="metric">
                        <strong>Total:</strong><br>
                        Code: ${tokeiData.Total.code || 0}<br>
                        Comments: ${tokeiData.Total.comments || 0}<br>
                        Blanks: ${tokeiData.Total.blanks || 0}
                    </div>
                `
                    : ""
                }
            </div>
        </div>
        `
            : `
        <div class="section">
            <h2>📊 Code Statistics</h2>
            <p>Tokei analysis not available</p>
        </div>
        `
        }
    </div>
</body>
</html>`;
  }

  generateToolSection(toolName, result) {
    // Handle null or undefined result
    if (!result) {
      return `
        <div class="tool-section">
            <h2>❓ ${toolName.toUpperCase()} Analysis</h2>
            <p class="status-skipped">Status: not run</p>
        </div>
      `;
    }

    const statusClass = `status-${result.status}`;
    const statusIcon =
      {
        success: "✅",
        failed: "❌",
        skipped: "⚠️",
        completed_with_issues: "⚠️",
      }[result.status] || "❓";

    let content = `
        <div class="tool-section">
            <h2>${statusIcon} ${toolName.toUpperCase()} Analysis</h2>
            <p class="${statusClass}">Status: ${result.status.replace("_", " ")}</p>
    `;

    if (
      result.status === "success" ||
      result.status === "completed_with_issues"
    ) {
      if (result.reportPath) {
        // Convert absolute path to relative path since HTML is in analysis-reports directory
        const relativePath = result.reportPath.replace("analysis-reports/", "");
        content += `<a href="${relativePath}" class="btn">View ${toolName} Report</a>`;
      }

      // Add action buttons for tools that have URLs
      if (result.url) {
        content += `<a href="${result.url}" class="btn" target="_blank">View Report</a>`;
      }

      if (toolName === "eslint" && result.errors !== undefined) {
        content += `
            <div class="grid">
                <div class="metric">
                    <strong>Files Analyzed:</strong> ${result.files || 0}
                </div>
                <div class="metric">
                    <strong>Errors:</strong> ${result.errors || 0}
                </div>
                <div class="metric">
                    <strong>Warnings:</strong> ${result.warnings || 0}
                </div>
            </div>
        `;
      }

      if (toolName === "advancedMetrics" && result.summary) {
        content += `
            <div class="grid">
                <div class="metric">
                    <strong>Files Analyzed:</strong> ${result.summary.totalFiles}
                </div>
                <div class="metric">
                    <strong>Avg Complexity:</strong> ${result.summary.averages.complexity}
                </div>
                <div class="metric">
                    <strong>Avg Maintainability:</strong> ${result.summary.averages.maintainability}
                </div>
                <div class="metric">
                    <strong>Avg LCoM:</strong> ${result.summary.averages.lcom}
                </div>
                <div class="metric">
                    <strong>Avg Coupling:</strong> ${result.summary.averages.coupling}
                </div>
                <div class="metric">
                    <strong>High Complexity Files:</strong> ${result.summary.issues.highComplexity}
                </div>
                <div class="metric">
                    <strong>Low Maintainability Files:</strong> ${result.summary.issues.lowMaintainability}
                </div>
                <div class="metric">
                    <strong>High Coupling Files:</strong> ${result.summary.issues.highCoupling}
                </div>
            </div>
        `;
      }

      if (toolName === "coverage") {
        content += `
            <div class="grid">`;

        // Frontend coverage metrics
        if (
          result.frontend &&
          result.frontend.status === "success" &&
          result.frontend.metrics
        ) {
          content += `
                <div class="metric">
                    <strong>Frontend Lines Coverage:</strong> ${result.frontend.metrics.lines.pct}%
                </div>
                <div class="metric">
                    <strong>Frontend Statements:</strong> ${result.frontend.metrics.statements.pct}%
                </div>
                <div class="metric">
                    <strong>Frontend Functions:</strong> ${result.frontend.metrics.functions.pct}%
                </div>
                <div class="metric">
                    <strong>Frontend Branches:</strong> ${result.frontend.metrics.branches.pct}%
                </div>`;
        } else if (result.frontend) {
          content += `
                <div class="metric">
                    <strong>Frontend Coverage:</strong> ${result.frontend.status.replace("_", " ")}
                </div>`;
        }

        // Rust coverage metrics
        if (
          result.rust &&
          result.rust.status === "success" &&
          result.rust.metrics
        ) {
          content += `
                <div class="metric">
                    <strong>Rust Lines Coverage:</strong> ${result.rust.metrics.lineRate}%
                </div>
                
                <div class="metric">
                    <strong>Rust Code Structure:</strong> ${result.rust.metrics.packages} packages, ${result.rust.metrics.classes} classes
                </div>`;
        } else if (result.rust) {
          content += `
                <div class="metric">
                    <strong>Rust Coverage:</strong> ${result.rust.status.replace("_", " ")}
                </div>`;
        }

        content += `
            </div>`;

        // Add combined report link
        if (result.combinedReportPath) {
          content += `<a href="${result.combinedReportPath.replace("analysis-reports/", "")}" class="btn">📊 View Combined Coverage Report</a>`;
        }
      }
    }

    if (result.error) {
      content += `<div style="background: #f8d7da; padding: 10px; border-radius: 5px; color: #721c24; margin-top: 10px;">
        <strong>Error:</strong> ${result.error}
      </div>`;
    }

    content += "</div>";
    return content;
  }

  generateAdvancedMetricsHTML(detailedReport) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Advanced Metrics Analysis Report - ${this.results.project.name}</title>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; }
        .header { background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); margin-bottom: 20px; }
        .section { background: white; margin: 20px 0; padding: 25px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .status-success { color: #28a745; }
        .status-warning { color: #ffc107; }
        .status-danger { color: #dc3545; }
        .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; }
        .metric { background: #f8f9fa; padding: 15px; border-radius: 5px; border-left: 4px solid #007bff; }
        .metric.warning { border-left-color: #ffc107; }
        .metric.danger { border-left-color: #dc3545; }
        h1 { color: #343a40; margin: 0; }
        h2 { color: #495057; border-bottom: 2px solid #e9ecef; padding-bottom: 10px; }
        h3 { color: #495057; margin-top: 20px; }
        .timestamp { color: #6c757d; font-size: 0.9em; }
        .summary-stats { display: flex; gap: 20px; margin: 20px 0; flex-wrap: wrap; }
        .stat-card { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px; text-align: center; flex: 1; min-width: 150px; }
        .stat-number { font-size: 2em; font-weight: bold; }
        .stat-label { font-size: 0.9em; opacity: 0.9; }
        .file-list { max-height: 300px; overflow-y: auto; border: 1px solid #dee2e6; border-radius: 5px; padding: 10px; background: #f8f9fa; }
        .file-item { padding: 5px 0; border-bottom: 1px solid #e9ecef; }
        .file-item:last-child { border-bottom: none; }
        .file-name { font-family: monospace; font-size: 0.9em; }
        .metric-value { font-weight: bold; margin-left: 10px; }
        .threshold-info { background: #e7f3ff; padding: 10px; border-radius: 5px; margin: 10px 0; border-left: 4px solid #007bff; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔬 Advanced Metrics Analysis Report</h1>
            <p>${this.results.project.name}</p>
            <div class="timestamp">Report generated: ${new Date().toLocaleString()}</div>
        </div>

        <div class="summary-stats">
            <div class="stat-card">
                <div class="stat-number">${detailedReport.summary.totalFiles}</div>
                <div class="stat-label">Total Files Analyzed</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${detailedReport.summary.successfulAnalyses || 0}</div>
                <div class="stat-label">Full Analysis</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${detailedReport.summary.analysisRatio || "0"}%</div>
                <div class="stat-label">Success Rate</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${detailedReport.summary.averages.complexity}</div>
                <div class="stat-label">Avg Complexity</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${detailedReport.summary.averages.maintainability}</div>
                <div class="stat-label">Avg Maintainability</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${detailedReport.summary.averages.lcom}</div>
                <div class="stat-label">Avg LCoM</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${detailedReport.summary.averages.coupling}</div>
                <div class="stat-label">Avg Coupling</div>
            </div>
        </div>

        <div class="threshold-info">
            <strong>📊 Analysis Thresholds:</strong>
            Complexity > ${detailedReport.summary.thresholds.complexity}, 
            Maintainability < ${detailedReport.summary.thresholds.maintainability}<br>
            <strong>🔧 Analysis Methods:</strong>
            ESLintCC for compatible files, fallback regex analysis for problematic files
        </div>

        <div class="section">
            <h2>📊 Metrics Overview</h2>
            <div class="grid">
                <div class="metric ${detailedReport.summary.averages.complexity > detailedReport.summary.thresholds.complexity ? "danger" : "success"}">
                    <strong>Cyclomatic Complexity:</strong><br>
                    Average: ${detailedReport.summary.averages.complexity}<br>
                    Threshold: ≤ ${detailedReport.summary.thresholds.complexity}
                </div>
                <div class="metric ${detailedReport.summary.averages.maintainability < detailedReport.summary.thresholds.maintainability ? "danger" : "success"}">
                    <strong>Maintainability Index:</strong><br>
                    Average: ${detailedReport.summary.averages.maintainability}<br>
                    Threshold: ≥ ${detailedReport.summary.thresholds.maintainability}
                </div>
                <div class="metric ${detailedReport.summary.averages.lcom > 0.7 ? "warning" : "success"}">
                    <strong>LCoM (Lack of Cohesion):</strong><br>
                    Average: ${detailedReport.summary.averages.lcom}<br>
                    Lower is better (0-1 scale)
                </div>
                <div class="metric ${detailedReport.summary.averages.coupling > 10 ? "warning" : "success"}">
                    <strong>Coupling:</strong><br>
                    Average: ${detailedReport.summary.averages.coupling}<br>
                    Lower is better
                </div>
            </div>
        </div>

        <div class="section">
            <h2>⚠️ Issues Summary</h2>
            <div class="grid">
                <div class="metric ${detailedReport.summary.issues.highComplexity > 0 ? "danger" : "success"}">
                    <strong>High Complexity Files:</strong><br>
                    ${detailedReport.summary.issues.highComplexity} files
                </div>
                <div class="metric ${detailedReport.summary.issues.lowMaintainability > 0 ? "danger" : "success"}">
                    <strong>Low Maintainability Files:</strong><br>
                    ${detailedReport.summary.issues.lowMaintainability} files
                </div>
                <div class="metric ${detailedReport.summary.issues.highCoupling > 0 ? "warning" : "success"}">
                    <strong>High Coupling Files:</strong><br>
                    ${detailedReport.summary.issues.highCoupling} files
                </div>
            </div>
        </div>

        ${
          detailedReport.problematicFiles.highComplexity.length > 0
            ? `
        <div class="section">
            <h2>🔴 High Complexity Files</h2>
            <p>Files with cyclomatic complexity > ${detailedReport.summary.thresholds.complexity}:</p>
            <div class="file-list">
                ${detailedReport.problematicFiles.highComplexity
                  .map(
                    (f) => `
                    <div class="file-item">
                        <span class="file-name">${f.file}</span>
                        <span class="metric-value status-danger">Complexity: ${f.complexity}</span>
                    </div>
                `,
                  )
                  .join("")}
            </div>
        </div>
        `
            : ""
        }

        ${
          detailedReport.problematicFiles.lowMaintainability.length > 0
            ? `
        <div class="section">
            <h2>🔴 Low Maintainability Files</h2>
            <p>Files with maintainability index < ${detailedReport.summary.thresholds.maintainability}:</p>
            <div class="file-list">
                ${detailedReport.problematicFiles.lowMaintainability
                  .map(
                    (f) => `
                    <div class="file-item">
                        <span class="file-name">${f.file}</span>
                        <span class="metric-value status-danger">Maintainability: ${f.maintainability.toFixed(2)}</span>
                    </div>
                `,
                  )
                  .join("")}
            </div>
        </div>
        `
            : ""
        }

        ${
          detailedReport.problematicFiles.highCoupling.length > 0
            ? `
        <div class="section">
            <h2>🟡 High Coupling Files</h2>
            <p>Files with high efferent coupling (> 10 dependencies):</p>
            <div class="file-list">
                ${detailedReport.problematicFiles.highCoupling
                  .map(
                    (f) => `
                    <div class="file-item">
                        <span class="file-name">${f.file}</span>
                        <span class="metric-value status-warning">Coupling: ${f.coupling}</span>
                    </div>
                `,
                  )
                  .join("")}
            </div>
        </div>
        `
            : ""
        }

        <div class="section">
            <h2>📈 Understanding the Metrics</h2>
            <div class="grid">
                <div class="metric">
                    <strong>Cyclomatic Complexity:</strong><br>
                    Measures the number of linearly independent paths through code. 
                    Higher values indicate more complex code that's harder to test and maintain.
                </div>
                <div class="metric">
                    <strong>Maintainability Index:</strong><br>
                    A composite metric (0-100) that considers complexity, lines of code, and Halstead metrics. 
                    Higher values indicate more maintainable code.
                </div>
                <div class="metric">
                    <strong>LCoM (Lack of Cohesion):</strong><br>
                    Measures how well the methods in a class work together. 
                    Lower values (closer to 0) indicate better cohesion.
                </div>
                <div class="metric">
                    <strong>Coupling:</strong><br>
                    Measures dependencies between modules. 
                    Lower coupling generally leads to more maintainable and testable code.
                </div>
            </div>
        </div>

        <div class="section">
            <h2>📁 Raw Data</h2>
            <p>Detailed metrics for all files are available in:</p>
            <ul>
                <li><strong>JSON Format:</strong> <a href="detailed-metrics.json" target="_blank">detailed-metrics.json</a></li>
                <li><strong>View in project:</strong> <code>analysis-reports/metrics/detailed-metrics.json</code></li>
            </ul>
        </div>
    </div>
</body>
</html>`;
  }

  async generateCombinedCoverageReport(coverageResults) {
    const coverageDir = path.join(this.reportDir, "coverage");
    const reportPath = path.join(coverageDir, "index.html");

    // Build HTML content using string concatenation to avoid template literal issues
    let htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Combined Coverage Report - ${this.results.project.name}</title>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; }
        .header { background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); margin-bottom: 20px; }
        .section { background: white; margin: 20px 0; padding: 25px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .status-success { color: #28a745; }
        .status-warning { color: #ffc107; }
        .status-failed { color: #dc3545; }
        .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; }
        .metric { background: #f8f9fa; padding: 15px; border-radius: 5px; border-left: 4px solid #007bff; }
        .metric.good { border-left-color: #28a745; }
        .metric.warning { border-left-color: #ffc107; }
        .metric.poor { border-left-color: #dc3545; }
        h1 { color: #343a40; margin: 0; }
        h2 { color: #495057; border-bottom: 2px solid #e9ecef; padding-bottom: 10px; }
        .timestamp { color: #6c757d; font-size: 0.9em; }
        .summary-stats { display: flex; gap: 20px; margin: 20px 0; flex-wrap: wrap; }
        .stat-card { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px; text-align: center; flex: 1; min-width: 150px; }
        .stat-number { font-size: 2em; font-weight: bold; }
        .stat-label { font-size: 0.9em; opacity: 0.9; }
        .btn { display: inline-block; padding: 10px 20px; background: #007bff; color: white; text-decoration: none; border-radius: 5px; margin: 5px; }
        .btn:hover { background: #0056b3; }
        .coverage-bar { width: 100%; height: 20px; background: #e9ecef; border-radius: 10px; overflow: hidden; margin: 5px 0; }
        .coverage-fill { height: 100%; transition: width 0.3s ease; }
        .coverage-high { background: #28a745; }
        .coverage-medium { background: #ffc107; }
        .coverage-low { background: #dc3545; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📊 Combined Coverage Report</h1>
            <p>${this.results.project.name}</p>
            <div class="timestamp">Report generated: ${new Date().toLocaleString()}</div>
        </div>

        <div class="summary-stats">
            <div class="stat-card">
                <div class="stat-number">${coverageResults.frontend?.status === "success" ? "✅" : "❌"}</div>
                <div class="stat-label">Frontend Coverage</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${coverageResults.rust?.status === "success" ? "✅" : "❌"}</div>
                <div class="stat-label">Rust Coverage</div>
            </div>`;

    // Add frontend metrics card if available
    if (coverageResults.frontend?.metrics) {
      htmlContent += `
            <div class="stat-card">
                <div class="stat-number">${coverageResults.frontend.metrics.lines.pct}%</div>
                <div class="stat-label">Frontend Lines</div>
            </div>`;
    }

    // Add rust metrics card if available
    if (coverageResults.rust?.metrics) {
      htmlContent += `
            <div class="stat-card">
                <div class="stat-number">${coverageResults.rust.metrics.lineRate}%</div>
                <div class="stat-label">Rust Lines</div>
            </div>`;
    }

    htmlContent += `
        </div>`;

    // Add frontend coverage section
    if (coverageResults.frontend) {
      htmlContent += `
        <div class="section">
            <h2>🌐 Frontend Coverage (Vitest)</h2>
            <p class="status-${coverageResults.frontend.status}">Status: ${coverageResults.frontend.status.replace("_", " ")}</p>`;

      if (coverageResults.frontend.status === "success") {
        if (coverageResults.frontend.metrics) {
          htmlContent += `
                <div class="grid">`;

          // Lines coverage
          const linesClass = this.getCoverageClass(
            coverageResults.frontend.metrics.lines.pct,
          );
          const linesColorClass = this.getCoverageColorClass(
            coverageResults.frontend.metrics.lines.pct,
          );
          const linesWidth = coverageResults.frontend.metrics.lines.pct;
          htmlContent += `
                    <div class="metric ${linesClass}">
                        <strong>Lines Coverage:</strong> ${coverageResults.frontend.metrics.lines.pct}%
                        <div class="coverage-bar">
                            <div class="coverage-fill ${linesColorClass}" style="width: ${linesWidth}%"></div>
                        </div>
                        <small>${coverageResults.frontend.metrics.lines.covered}/${coverageResults.frontend.metrics.lines.total} lines</small>
                    </div>`;

          // Statements coverage
          const statementsClass = this.getCoverageClass(
            coverageResults.frontend.metrics.statements.pct,
          );
          const statementsColorClass = this.getCoverageColorClass(
            coverageResults.frontend.metrics.statements.pct,
          );
          const statementsWidth =
            coverageResults.frontend.metrics.statements.pct;
          htmlContent += `
                    <div class="metric ${statementsClass}">
                        <strong>Statements Coverage:</strong> ${coverageResults.frontend.metrics.statements.pct}%
                        <div class="coverage-bar">
                            <div class="coverage-fill ${statementsColorClass}" style="width: ${statementsWidth}%"></div>
                        </div>
                        <small>${coverageResults.frontend.metrics.statements.covered}/${coverageResults.frontend.metrics.statements.total} statements</small>
                    </div>`;

          // Functions coverage
          const functionsClass = this.getCoverageClass(
            coverageResults.frontend.metrics.functions.pct,
          );
          const functionsColorClass = this.getCoverageColorClass(
            coverageResults.frontend.metrics.functions.pct,
          );
          const functionsWidth = coverageResults.frontend.metrics.functions.pct;
          htmlContent += `
                    <div class="metric ${functionsClass}">
                        <strong>Functions Coverage:</strong> ${coverageResults.frontend.metrics.functions.pct}%
                        <div class="coverage-bar">
                            <div class="coverage-fill ${functionsColorClass}" style="width: ${functionsWidth}%"></div>
                        </div>
                        <small>${coverageResults.frontend.metrics.functions.covered}/${coverageResults.frontend.metrics.functions.total} functions</small>
                    </div>`;

          // Branches coverage
          const branchesClass = this.getCoverageClass(
            coverageResults.frontend.metrics.branches.pct,
          );
          const branchesColorClass = this.getCoverageColorClass(
            coverageResults.frontend.metrics.branches.pct,
          );
          const branchesWidth = coverageResults.frontend.metrics.branches.pct;
          htmlContent += `
                    <div class="metric ${branchesClass}">
                        <strong>Branches Coverage:</strong> ${coverageResults.frontend.metrics.branches.pct}%
                        <div class="coverage-bar">
                            <div class="coverage-fill ${branchesColorClass}" style="width: ${branchesWidth}%"></div>
                        </div>
                        <small>${coverageResults.frontend.metrics.branches.covered}/${coverageResults.frontend.metrics.branches.total} branches</small>
                    </div>
                </div>`;
        }

        htmlContent += `
                <div style="margin-top: 20px;">
                    <a href="frontend/index.html" class="btn">📊 View Detailed Frontend Coverage Report</a>
                    <a href="frontend/cobertura-coverage.xml" class="btn">📄 Download XML Report</a>
                    <a href="frontend/coverage-final.json" class="btn">📄 Download JSON Report</a>
                </div>`;
      } else {
        htmlContent += `
                <div style="background: #f8d7da; padding: 10px; border-radius: 5px; color: #721c24; margin-top: 10px;">
                    <strong>Error:</strong> ${coverageResults.frontend.error || coverageResults.frontend.message}
                </div>`;
      }

      htmlContent += `
        </div>`;
    }

    // Add rust coverage section
    if (coverageResults.rust) {
      htmlContent += `
        <div class="section">
            <h2>🦀 Rust Coverage (cargo-llvm-cov)</h2>
            <p class="status-${coverageResults.rust.status}">Status: ${coverageResults.rust.status.replace("_", " ")}</p>`;

      if (coverageResults.rust.status === "success") {
        if (coverageResults.rust.metrics) {
          htmlContent += `
                <div class="grid">`;

          // Lines coverage
          const rustLinesClass = this.getCoverageClass(
            coverageResults.rust.metrics.lineRate,
          );
          const rustLinesColorClass = this.getCoverageColorClass(
            coverageResults.rust.metrics.lineRate,
          );
          const rustLinesWidth = coverageResults.rust.metrics.lineRate;
          htmlContent += `
                    <div class="metric ${rustLinesClass}">
                        <strong>Lines Coverage:</strong> ${coverageResults.rust.metrics.lineRate}%
                        <div class="coverage-bar">
                            <div class="coverage-fill ${rustLinesColorClass}" style="width: ${rustLinesWidth}%"></div>
                        </div>
                        <small>${coverageResults.rust.metrics.linesCovered}/${coverageResults.rust.metrics.linesValid} lines</small>
                    </div>`;

          // Branches coverage
          const rustBranchesClass = this.getCoverageClass(
            coverageResults.rust.metrics.branchRate,
          );
          const rustBranchesColorClass = this.getCoverageColorClass(
            coverageResults.rust.metrics.branchRate,
          );
          const rustBranchesWidth = coverageResults.rust.metrics.branchRate;
          htmlContent += `
                    <div class="metric ${rustBranchesClass}">
                        <strong>Branches Coverage:</strong> ${coverageResults.rust.metrics.branchRate}%
                        <div class="coverage-bar">
                            <div class="coverage-fill ${rustBranchesColorClass}" style="width: ${rustBranchesWidth}%"></div>
                        </div>
                        <small>${coverageResults.rust.metrics.branchesCovered}/${coverageResults.rust.metrics.branchesValid} branches</small>
                    </div>`;

          // Additional metrics
          htmlContent += `
                    <div class="metric">
                        <strong>Code Structure:</strong><br>
                        Packages: ${coverageResults.rust.metrics.packages}<br>
                        Classes: ${coverageResults.rust.metrics.classes}
                    </div>
                    <div class="metric">
                        <strong>Coverage Quality:</strong><br>
                        ${this.getCoverageQualityText(coverageResults.rust.metrics.lineRate)}
                    </div>
                </div>`;
        }

        htmlContent += `
                <div style="margin-top: 20px;">
                    <a href="rust/cargo-coverage.xml" class="btn">📄 Download Rust Coverage XML</a>
                </div>`;
      } else {
        htmlContent += `
                <div style="background: #f8d7da; padding: 10px; border-radius: 5px; color: #721c24; margin-top: 10px;">
                    <strong>Error:</strong> ${coverageResults.rust.error || coverageResults.rust.message}
                </div>`;
      }

      htmlContent += `
        </div>`;
    }

    // Add remaining static sections
    htmlContent += `
        <div class="section">
            <h2>📁 Coverage Reports Structure</h2>
            <p>All coverage reports are organized in the coverage directory:</p>
            <ul>
                <li><strong>Frontend:</strong> 
                    <ul>
                        <li><a href="frontend/index.html">coverage/frontend/index.html</a> - Interactive HTML report</li>
                        <li><a href="frontend/cobertura-coverage.xml">coverage/frontend/cobertura-coverage.xml</a> - XML format for CI/CD</li>
                        <li><a href="frontend/coverage-final.json">coverage/frontend/coverage-final.json</a> - JSON format</li>
                    </ul>
                </li>
                <li><strong>Rust:</strong>
                    <ul>
                        <li><a href="rust/cargo-coverage.xml">coverage/rust/cargo-coverage.xml</a> - Cobertura XML format</li>
                    </ul>
                </li>
            </ul>
        </div>

        <div class="section">
            <h2>📋 Coverage Guidelines</h2>
            <div class="grid">
                <div class="metric good">
                    <strong>Good Coverage (80%+):</strong><br>
                    Well-tested code with most paths covered
                </div>
                <div class="metric warning">
                    <strong>Moderate Coverage (60-79%):</strong><br>
                    Decent coverage but room for improvement
                </div>
                <div class="metric poor">
                    <strong>Poor Coverage (<60%):</strong><br>
                    Significant testing gaps - consider adding tests
                </div>
            </div>
        </div>
    </div>
</body>
</html>`;

    fs.writeFileSync(reportPath, htmlContent);
    return path.join("coverage", "index.html");
  }

  getCoverageClass(percentage) {
    if (percentage >= 80) return "good";
    if (percentage >= 60) return "warning";
    return "poor";
  }

  getCoverageColorClass(percentage) {
    if (percentage >= 80) return "coverage-high";
    if (percentage >= 60) return "coverage-medium";
    return "coverage-low";
  }

  getCoverageQualityText(percentage) {
    if (percentage >= 90) return "Excellent coverage quality";
    if (percentage >= 80) return "Good coverage quality";
    if (percentage >= 70) return "Fair coverage quality";
    if (percentage >= 60) return "Basic coverage quality";
    return "Needs improvement";
  }
}

const runner = new AnalysisRunner();
runner.run().catch(console.error);

export default AnalysisRunner;
