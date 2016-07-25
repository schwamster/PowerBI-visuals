
/// <reference path="../../../_references.ts"/>

module powerbi.visuals.samples {
    import SelectionManager = utility.SelectionManager;

    export interface MultiColumnSlicerViewModel 
    {
        columns: MultiColumnInfo[];
    }

    export interface MultiColumnInfo extends SelectableDataPoint {
        text: string;
        toolTipInfo: TooltipDataItem[];
    }


    export class MultiColumnSlicer implements IVisual {
        
        private static DefaultText = 'Invalid DV';
        private root: D3.Selection;
        private svgText: D3.Selection;
        private svgSecondCategory: D3.Selection;
        private svgContainer: D3.Selection;
        private dataView: DataView;
        private selectiionManager: SelectionManager;    
        private selectionHandler: ISelectionHandler;
        private hostServices: IVisualHostServices;

        public init(options: VisualInitOptions): void {
            var viewport = options.viewport;           

            this.root = d3.select(options.element.get(0))
                .append("div")
                .style("height","100%")
                .style("width", "100%")
                .text("Lädt...");

            this.root.attr({
                'height': viewport.height,
                'width': viewport.width
            });

            this.selectiionManager = new SelectionManager({ hostServices: options.host });
            var interactivityService =  new InteractivityService(options.host);
            this.selectionHandler = interactivityService; 
            this.hostServices = options.host;

        }

        public update(options: VisualUpdateOptions) {
            if (!options.dataViews && !options.dataViews[0]) return;
            var dataView = this.dataView = options.dataViews[0];
            var viewport = options.viewport;
            var viewModel: MultiColumnSlicerViewModel = MultiColumnSlicer.converter(dataView);

            this.root.text("");
            var selectionManager = this.selectiionManager;
            var selectionHandler : ISelectionHandler = this.selectionHandler;
            var hostServices : IVisualHostServices = this.hostServices;

            for(var i = 0; i < viewModel.columns.length;i++)
            { 
                var column: MultiColumnInfo = viewModel.columns[i];
                var category = this.root
                    .append('text')
                    .attr("class", "multiColumnSlicerCategory")
                    .attr("id", `col${i}`)
                    .text(`${column.text}`)
                    .style('cursor', 'pointer')
                    .style('background-color', 'transparent')
                    .on('click', function (d: MultiColumnInfo) {
                        var localColumn = column;
                        //d3.event.preventDefault();
                        //selectionHandler.handleSelection(d, false);
                        //selectionHandler.persistSelectionFilter(slicerProps.filterPropertyIdentifier);
                    
                        console.log(`huhu selectionHandler ${d.text} ${d.selected}`);
                         selectionManager
                             .select(this.__data__.identity)
                             .then(ids => {    
                                 d3.selectAll(".multiColumnSlicerCategory").style("background-color", "transparent");
                                d3.select(this).style('background-color', ids.length > 0 ? "grey" : "transparent");
                                console.log(ids);
                            }
                            );

                        hostServices.persistProperties(this);
                    })
                    .data([column]);
                
                this.root.append("br");

                TooltipManager.addTooltip(category, (tooltipEvent: TooltipEvent) => tooltipEvent.data.toolTipInfo);
                
            }
        }

        public static converter(dataView: DataView): MultiColumnSlicerViewModel {


           var viewModel: MultiColumnSlicerViewModel = {
               columns: []
           };

            for(var ci = 0; ci < dataView.categorical.categories.length; ci++)
            {
                var category = dataView.categorical.categories[ci];
                if(!category) continue;

                var queryName = category.source.queryName;
                var tableName = queryName.substr(0, queryName.indexOf("."));
                var fieldName = queryName.substr(queryName.indexOf(".") + 1);
                var fieldExpr = powerbi.data.SQExprBuilder.fieldExpr({ column: { schema: 's', entity: tableName, name: fieldName} });
                var expr = powerbi.data.SQExprBuilder.equal(fieldExpr, powerbi.data.SQExprBuilder.boolean(true));  
                var cid = powerbi.data.createDataViewScopeIdentity(expr);                    

                var columnInfo: MultiColumnInfo = {
                    text:`${MultiColumnSlicer.translateCategory(category.source.displayName, ci)}`,
                    toolTipInfo: [{
                        displayName: `${tableName} / ${fieldName}`,
                        value: 'true',
                    }],
                    identity: SelectionId.createWithId(cid),
                    selected: false
                };

                viewModel.columns.push(columnInfo);
            }

            var table = dataView.table;
            if (!table) return viewModel;

            return viewModel;
        }

        public static translateCategory(category: string, index: number) : string {
            //todo: make configurable and map category index instead
            if(category.toLowerCase().indexOf("today") > 0)
            {
                return "Heute";
            }

            if(category.toLowerCase().indexOf("yesterday") > 0)
            {
                return "Gestern";
            }

            if(category.toLowerCase().indexOf("week") > 0)
            {
                return "Aktuelle Woche";
            }

            if(category.toLowerCase().indexOf("month") > 0)
            {
                return "Aktueller Monat";
            }

            return category;

        }

        public enumerateObjectInstances(options: EnumerateVisualObjectInstancesOptions): VisualObjectInstance[] {
            var instances: VisualObjectInstance[] = [];
            var dataView = this.dataView;
            switch (options.objectName) {
                case 'general':
                    var general: VisualObjectInstance = {
                        objectName: 'general',
                        selector: null,
                        properties: {
                            fill: MultiColumnSlicer.getFill(dataView),
                            size: MultiColumnSlicer.getSize(dataView)
                        }
                    };
                    instances.push(general);
                    break;
                case 'captions':
                    var general: VisualObjectInstance = {
                        objectName: 'captions',
                        selector: null,
                        properties: {
                            firstCategory: "A",
                            secondCategory: "B"
                        }
                    };
                    instances.push(general);
                    break;
            }


            return instances;
        }

         public destroy(): void {
            this.root = null;
        }

        
        public static capabilities: VisualCapabilities = {
            dataRoles: [
                {
                    name: 'Category',
                    kind: VisualDataRoleKind.Grouping,
                    displayName: 'Category',
                },
                ],
            dataViewMappings: [{
                categorical: {
                    categories: {
                    for: { in: 'Category'},
                    dataReductionAlgorithm: { window: {} }
                }},
            }],
            objects: {
                general: {
                    displayName: data.createDisplayNameGetter('Visual_General'),
                    properties: {
                        fill: {
                            type: { fill: { solid: { color: true } } },
                            displayName: 'Fill'
                        },
                        size: {
                            type: { numeric: true },
                            displayName: 'Size'
                        }
                    },
                },
                captions: {
                    displayName: "Captions",
                    properties: {
                        firstCategory:{
                            type: {text: true},
                            displayName: '1st Category'
                        },
                        secondCategory:{
                            type: {text: true},
                            displayName: '2nd Category'
                        }
                    }
                }
            },
        };

        

         private static getFill(dataView: DataView): Fill {
            if (dataView) {
                var objects = dataView.metadata.objects;
                if (objects) {
                    var general = objects['general'];
                    if (general) {
                        var fill = <Fill>general['fill'];
                        if (fill)
                            return fill;
                    }
                }
            }
            return { solid: { color: 'red' } };
        }

        private static getSize(dataView: DataView): number {
            if (dataView) {
                var objects = dataView.metadata.objects;
                if (objects) {
                    var general = objects['general'];
                    if (general) {
                        var size = <number>general['size'];
                        if (size)
                            return size;
                    }
                }
            }
            return 100;
        }
    }
}