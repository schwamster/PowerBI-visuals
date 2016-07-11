
/// <reference path="../../../_references.ts"/>

module powerbi.visuals.samples {
    import SelectionManager = utility.SelectionManager;
    export interface MultiColumnSlicerViewModel {
        text: string;
        color: string;
        size: number;
        selector: SelectionId;
        toolTipInfo: TooltipDataItem[];
    }

    export class MultiColumnSlicer implements IVisual {
        
        private static DefaultText = 'Invalid DV';
        private root: D3.Selection;
        private svgText: D3.Selection;
        private svgSecondCategory: D3.Selection;
        private dataView: DataView;
        private selectiionManager: SelectionManager;    

        public init(options: VisualInitOptions): void {
            this.root = d3.select(options.element.get(0))
                .append('svg')
                .classed('hello', true);

            this.svgText = this.root
                .append('text')
                .style('cursor', 'pointer')
                .attr('text-anchor', 'middle')
                .text("huhu1");
            
            this.selectiionManager = new SelectionManager({ hostServices: options.host });

        }

        public update(options: VisualUpdateOptions) {
            if (!options.dataViews && !options.dataViews[0]) return;
            var dataView = this.dataView = options.dataViews[0];
            var viewport = options.viewport;
            var viewModel: MultiColumnSlicerViewModel = MultiColumnSlicer.converter(dataView);

            this.root.attr({
                'height': viewport.height,
                'width': viewport.width
            });

            var textProperties = {
                fontFamily: 'tahoma',
                fontSize: viewModel.size + 'px',
                text: viewModel.text
            };
            var textHeight = TextMeasurementService.estimateSvgTextHeight(textProperties);
            var selectionManager = this.selectiionManager;

            this.svgText.style({
                'fill': viewModel.color,
                'font-size': textProperties.fontSize,
                'font-family': textProperties.fontFamily,
            }).attr({
                'y': viewport.height / 2 + textHeight / 3 + 'px',
                'x': viewport.width / 2,
            }).text("IsToday")//viewModel.text)
                .on('click', function () {
                    selectionManager
                        .select(viewModel.selector)
                        .then(ids => {
                            d3.select(this).style('stroke-width', ids.length > 0 ? '2px' : '0px');
                            d3.select(this).style('fill', ids.length > 0 ? viewModel.color : "green");
                            console.log(ids);
                        }
                        );
                })
                .data([viewModel]);

            var x = this.root;
                x.append("foreignObject")
                .attr("width", 100)
                .attr("height", 100)
                .attr({
                'y': viewport.height / 2 + textHeight / 3 + 'px',
                'x': viewport.width / 2,
                    })
                .append("xhtml:body")
                .html("<form><input type=checkbox id=check />hehe</form>")
                .on("click", function(d, i){
                    console.log(x.select("#check").node().getAttribute("checked"));
                    selectionManager
                        .select(viewModel.selector)
                        .then(ids => {
                            d3.select(this).style('stroke-width', ids.length > 0 ? '2px' : '0px');
                            d3.select(this).style('color', ids.length > 0 ? viewModel.color : "green");
                            console.log(ids);
                        }
                        );
                }).data([viewModel]);


            TooltipManager.addTooltip(this.svgText, (tooltipEvent: TooltipEvent) => tooltipEvent.data.toolTipInfo);
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
                // {
                //     name: 'Values',
                //     kind: VisualDataRoleKind.GroupingOrMeasure,
                //     displayName: 'Values'
                // }
                ],
            dataViewMappings: [{
                categorical: {
                    categories: {
                    for: { in: 'Category'},
                    dataReductionAlgorithm: {top:{}}
                }},
                // table: {
                //     rows: {
                //         for: { in: 'Values' },
                //     },
                //     rowCount: { preferred: { min: 1 } }
                // },
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

        public static converter(dataView: DataView): MultiColumnSlicerViewModel {
           
            var viewModel: MultiColumnSlicerViewModel = {
                size: MultiColumnSlicer.getSize(dataView),
                color: MultiColumnSlicer.getFill(dataView).solid.color,
                text: MultiColumnSlicer.DefaultText,
                toolTipInfo: [{
                    displayName: 'Test',
                    value: '1...2....3... can you see me? I am sending random strings to the tooltip',
                }],
                selector: SelectionId.createNull()
            };
            var table = dataView.table;
            if (!table) return viewModel;

            //viewModel.text = table.rows[0][0];
            viewModel.text = dataView.categorical.categories[0].values[0];
            if (dataView.categorical) {
                viewModel.selector = dataView.categorical.categories[0].identity
                    ? SelectionId.createWithId(dataView.categorical.categories[0].identity[0])
                    : SelectionId.createNull();
            }

            return viewModel;
        }

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