# Basics

The application can either be directly downloaded in its expanded form from TODO, or as a compressed bundle from TODO. If you choose the latter, follow the setup instructions to install the app locally.

Once you launch the application, you need to choose an input DuckDB database, which comes in the format of a file with the .duckdb extension. Please refer to the Tulipa Energy Model official documentation LINK TODO for further information on how to run the optimization and export the solution as a DuckDB file.

Next, the green Add Graph button can be used to add one or more graph card. Each cardhas to be configured with a chart type out of the available options, discussed below, and a database from the loaded ones. The graph cards can also be resized to take up half or the entire width and removed.

The linked databases can also be removed, in which cases all the cards that were using the deleted database will also be deleted. Once a database is removed, you must restart the application to connect to it again.

# Chart types

## Asset capacity

Retrieves the capacity of assets like solar. On default, it shows the capacities of all assets, but one can apply filters and breakdowns. Each capacity is shown with 2 bars; the left bar with the initial capacity, investments, and decommissions, and the right bar with the final capacity. Each asset is distinguished by the unique color of its final capacity bar.

## System costs

This KPI refers to the essence of the optimization, representing the objective value that is attempted to be minimized. It focuses on the operation costs associated with the output of the scenario, as defined [here](https://tulipaenergy.github.io/TulipaEnergyModel.jl/dev/40-formulation/#Objective-Function). The graph displays values by milestone year, where, for each year, there are two columns \- one for flow costs, one for asset costs.

They are further broken down as follows:

- Asset costs are split in Fixed and Unit On costs. For metadata-enriched databases, assets can be further filtered, and respective Fixed and Unit On categories further broken down as defined by the user.
- Flow costs are split in Fixed and Variable costs, each of the two being broken down by energy carrier.

Please note that the legend only contains labels corresponding to non-zero values.

## Production prices

Retrieves production price data given a specific year and a specific resolution.

By default, the price is shown for all carriers, but a specific carrier may be chosen as well.

Using the duration curve option, prices can be sorted by magnitude.

## Storage prices

Retrieves storage price data given a specific year and a specific resolution for:

- short-term storage (assets that store energy e.g. for a few hours like batteries),
- long-term storage (seasonal storage, modelled for the entire periods, rather for the time blocks of the periods),
- or both, combined.

By default, the price is shown for all energy carriers (e.g. electricity, hydrogen), but a specific carrier may be chosen as well.

Using the duration curve option, prices can be sorted by magnitude, yet retaining the relative duration of each block.

## Transportation prices

Retrieves transportation price data given a specific year and a specific resolution.

The price can be seen both for:

- MIN: the case when you limit by 1 unit of the constraint for the minimal transportation price (e.g. min_transportation \>= 5 goes to min_transportation \>= 6),
- MAX: for when you relax by 1 unit the constraint for the maximal transportation price (e.g. max_transportation \<=5 to max_transportation \<=6).

By default, the price is shown for all carriers, but a specific carrier may be chosen as well.

Using the duration curve option, prices can be sorted by magnitude.

## Geographical imports / exports

Displays net energy flow (import-export) between regions or countries, for a selected year, supporting both EU provinces/ World countries levels. Requires a metadata-enriched DuckDB file, please refer to the corresponding section below.

Hovering over a region on the map shows:

- Total imports and exports in TWh
- Net energy flow
- Main trade partners (largest import and export connections)

An overview of import/export for each available region is also shown in card tables below the map.

## Residual load

Retrieves the supply of the electricity demand per time period. On default, it shows all the supplies, but one can also filter and breakdown on technologies and location. E.g., to get the residual load one can breakdown on renewables. The height of the bar is coupled with the demand, as this graph is a stacked bar chart.

## SQL explorer

For advanced use cases, the application also allows users to directly run SQL queries on the selected database. For ease of use, the component also includes an overview of the tables present in the selected databases, returns paginated results and saves a history of recent queries across sessions.

# Advanced features

## Data zoom

The user can either use the scroll wheel while placing the cursor on the graph, or use the handles of either data zoom sliders, identified through their blue background. This allows for focusing e.g. on a particular interval of time, or restricting the values shown. The latter can be particularly useful when displaying values of different magnitudes simultaneously, thus being able to “zoom in” and explore the smaller magnitude values in more detail.

## Legend filtering

Some graphs also display a legend of color-coded components that are being shown on the charts. The legend can also be used for filtering, hence temporarily removing some of the blocks being shown, by clicking on colored block in the legend.

## Metadata handling

The optimization performed by Tulipa energy model is agnostic to any form of asset metadata, yet when analyzing the results, it can be useful to zoom in on particular subsets of assets or apply certain partitionings. We have thus implemented support for tree-structured hierarchical metadata.

Because the legacy input DuckDB files do not contain this metadata, they can be enhanced by adding the asset_category and category tables, following the [schema](https://lucid.app/lucidchart/23c046dd-f57c-42f8-ab8e-0dad42261c45/edit?viewport_loc=583%2C-417%2C3704%2C2028%2C0_0&invitationId=inv_4c56086b-b257-4bb8-a752-c1b624ac9a30). The resulting "meta-trees" allow defining custom hierarchical relationships between subsets of assets.

For development purposes, the application code also includes a prepare_db_file.py which takes as input a non-enriched database and a specification of the category hierarchies to use \- hence a construction of the category table \- then randomly assigns assets to metadata, creating the necessary asset_category rable.

## Application state

The application state panel located in the bottom left corner is mainly used for development purposes to track the internal state of the application. Yet, advanced end users can also rely on it for assessing whether charts are actually displaying the same data, in particular when it comes to metadata features.
