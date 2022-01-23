import { Component, EventEmitter, OnInit, AfterViewInit, Input, ElementRef, ViewChild, Output } from '@angular/core';
import { MatDialog } from '@angular/material';
import { FormControl } from '@angular/forms';
import { takeUntil } from 'rxjs/operators';
import { Subject, ReplaySubject } from 'rxjs';

import { TranslateService } from '@ngx-translate/core';

import { Graph, GraphSource, GraphType, GraphBarProperty, GraphBarXType } from '../../../../_models/graph';
import { GraphConfigComponent } from '../../../../editor/graph-config/graph-config.component';
import { GraphBarComponent } from '../graph-bar/graph-bar.component';
import { GaugeGraphProperty } from '../../../../_models/hmi';
import { ChartOptions } from 'chart.js';

@Component({
    selector: 'app-graph-property',
    templateUrl: './graph-property.component.html',
    styleUrls: ['./graph-property.component.css']
})
export class GraphPropertyComponent implements OnInit, AfterViewInit {

    @Input() data: any;
    @Output() change: EventEmitter<any> = new EventEmitter();
    @Input('reload') set reload(b: any) { 
        this._reload(); 
    }

    graphBarType = GraphType.bar;
    graphType: GraphType = GraphType.pie;
    options: ChartOptions;

    graphCtrl: FormControl = new FormControl();
    graphFilterCtrl: FormControl = new FormControl();
    public filteredGraph: ReplaySubject<Graph[]> = new ReplaySubject<Graph[]>(1);

    private _onDestroy = new Subject<void>();

    constructor(
        public dialog: MatDialog,
        private translateService: TranslateService) { 
        }

    ngOnInit() {
        if (this.data.settings.type.endsWith('bar')) {
            this.graphType = GraphType.bar;
            if (!this.data.settings.property) {
                this.data.settings.property = <GaugeGraphProperty>{ id: null, type: null, options: null };
            } 
            if (!this.data.settings.property.options) {
                this.data.settings.property.options = GraphBarComponent.DefaultOptions();
            }
            this.options = this.data.settings.property.options;
        }
        this._reload();
    }

    ngAfterViewInit() {
    }

    ngOnDestroy() {
        this._onDestroy.next();
        this._onDestroy.complete();
    }

    private _reload() {
        this.loadGraphs();
        let graph = null;
        if (this.data.settings.property) {
            graph = this.data.graphs.find(graph => graph.id === this.data.settings.property.id);
        }
        this.graphCtrl.setValue(graph);
    }

    onGraphChanged() {
        this.data.settings.property = <GaugeGraphProperty>{ id: null, type: null, options: null };
        if (this.graphCtrl.value) {
            this.data.settings.name = this.graphCtrl.value.name;
            this.data.settings.property.id = this.graphCtrl.value.id;
            this.data.settings.property.type = this.graphCtrl.value.type;
        } else {
            this.data.settings.name = '';
        }
        this.data.settings.property.options = this.options;

        this.change.emit(this.data.settings);
    }

    onEditNewGraph() {
        let dialogRef = this.dialog.open(GraphConfigComponent, {
            position: { top: '60px' },
            minWidth: '1090px', width: '1090px',
            data: { type: (this.graphType === GraphType.bar) ? 'bar' : 'pie' }
        });
        dialogRef.afterClosed().subscribe(result => {
            if (result) {
                this.data.graphs = result;
                this.loadGraphs();
            }
        });
    }

    private loadGraphs(toset?: string) {
        // load the initial graph list
        this.filteredGraph.next(this.data.graphs.slice());
        // listen for search field value changes
        this.graphFilterCtrl.valueChanges
            .pipe(takeUntil(this._onDestroy))
            .subscribe(() => {
                this.filterGraph();
            });
        if (toset) {
            let idx = -1;
            this.data.graphs.every(function (value, index, _arr) {
                if (value.id === toset) {
                    idx = index;
                    return false;
                }
                return true;
            });
            if (idx >= 0) {
                this.graphCtrl.setValue(this.data.graphs[idx]);
            }
        }
    }

    private filterGraph() {
        if (!this.data.graphs) {
            return;
        }
        // get the search keyword
        let search = this.graphFilterCtrl.value;
        if (!search) {
            this.filteredGraph.next(this.data.graphs.slice());
            return;
        } else {
            search = search.toLowerCase();
        }
        // filter the variable
        this.filteredGraph.next(
            this.data.graphs.filter(graph => graph.name.toLowerCase().indexOf(search) > -1)
        );
    }
}
