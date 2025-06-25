# Tulipa Energy visualizer - User documentation

# Basics

The application can either be directly downloaded in its expanded form from TODO, or as a compressed bundle from TODO. If you choose the latter, follow the setup instructions to install the app locally.

Once you launch the application, you need to choose an input DuckDB database, which comes in the format of a file with the .duckdb extension. Please refer to the Tulipa Energy Model official documentation LINK TODO for further information on how to run the optimization and export the solution as a DuckDB file.

Next, the green Add Graph button can be used to add one or more graph card. Each cardhas to be configured with a chart type out of the available options, discussed below, and a database from the loaded ones. The graph cards can also be resized to take up half or the entire width and removed.

The linked databases can also be removed, in which cases all the cards that were using the deleted database will also be deleted. Once a database is removed, you must restart the application to connect to it again.

## Chart types

### Asset capacity

TODO

### System costs

TODO

### Production prices

Retrieves production price data given a specific year and a specific resolution. 

By default, the price is shown for all carriers, but a specific carrier may be chosen as well. 

Using the duration curve option, prices can be sorted by magnitude.

### Storage prices

Retrieves storage price data given a specific year and a specific resolution for:

- short-term storage (assets that store energy e.g. for a few hours like batteries),  
- long-term storage (seasonal storage, modelled for the entire periods, rather for the time blocks of the periods),  
- or both, combined.

By default, the price is shown for all energy carriers (e.g. electricity, hydrogen), but a specific carrier may be chosen as well. 

Using the duration curve option, prices can be sorted by magnitude, yet retaining the relative duration of each block.

### Transportation prices

Retrieves transportation price data given a specific year and a specific resolution. 

The price can be seen both for:

- MIN: the case when you limit by 1 unit of the constraint for the minimal transportation price (e.g. min\_transportation \>= 5 goes to min\_transportation \>= 6),   
- MAX: for when you relax by 1 unit the constraint for the maximal transportation price (e.g. max\_transportation \<=5 to max\_transportation \<=6). 

By default, the price is shown for all carriers, but a specific carrier may be chosen as well. 

Using the duration curve option, prices can be sorted by magnitude.

### Geographical imports / exports

TODO

### Residual load

TODO

### SQL explorer

TODO

## Advanced features

### Data zoom

TODO

### Metadata handling

TODO, show relational db with example

show example trees and example created tables

### Application state

normal workflows should not use it, etc.