import {
    AfterViewChecked,
    AfterViewInit,
    ChangeDetectionStrategy,
    ChangeDetectorRef,
    Component,
    ElementRef,
    Input,
    OnChanges,
    SimpleChanges,
    ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { newTabData } from '@lib/utils/storage/storage.types';
import * as CodeMirror from 'codemirror';
import 'codemirror/mode/sql/sql';
import 'codemirror/lib/codemirror.css';
import { ResultGridComponent } from '@pages/resultgrid/resultgrid.component';
import { BackendService } from '@lib/services';

@Component({
    selector: 'app-home',
    standalone: true,
    imports: [CommonModule, RouterModule, FormsModule, ResultGridComponent],
    templateUrl: './home.component.html',
})
export class HomeComponent implements OnChanges, AfterViewInit, AfterViewChecked {
    @Input() tabData!: newTabData;
    @ViewChild('editor', { static: false }) editor: ElementRef;
    @ViewChild('tabContainer', { static: false }) tabContainer: ElementRef;
    tabs = [];
    selectedTab = -1;
    tabContent: string[] = [];
    editorInstance: any;
    needsEditorInit = false;
    triggerQuery: string = '';
    executeTriggered: boolean = false;
    selectedDB: string = '';
    currentTabId: string = '';

    constructor(private cdr: ChangeDetectorRef) {}

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['tabData'] && this.tabData?.dbName && this.tabData?.tableName) {
            this.addTab(this.tabData.dbName, this.tabData.tableName);
        }
    }

    ngAfterViewInit() {
        this.checkAndInitializeEditor();
    }

    ngAfterViewChecked() {
        if (this.needsEditorInit && this.selectedTab >= 0 && this.editor && !this.editorInstance) {
            this.checkAndInitializeEditor();
            this.editorInstance.setValue(this.tabContent[this.selectedTab]);
            this.needsEditorInit = false;
        }
    }

    checkAndInitializeEditor() {
        if (!this.editorInstance && this.editor) {
            this.initializeEditor();
        }
    }

    initializeEditor() {
        if (!this.editorInstance) {
            this.editorInstance = CodeMirror.fromTextArea(this.editor.nativeElement, {
                lineNumbers: true,
                mode: 'sql',
                theme: 'default',
                lineWrapping: true,
                matchBrackets: true,
                showCursorWhenSelecting: true,
                smartIndent: true,
                extraKeys: {
                    'Ctrl-Space': 'autocomplete',
                    'Ctrl-Q': function (cm) {
                        cm.foldCode(cm.getCursor());
                    },
                },
                autofocus: true,
                cursorHeight: 0.85,
                gutters: ['CodeMirror-linenumbers', 'CodeMirror-foldgutter'],
                highlightSelectionMatches: {
                    showToken: /\w/,
                    annotateScrollbar: true,
                },
                hintOptions: {
                    completeSingle: false,
                },
                matchTags: { bothTags: true },
            });

            this.editorInstance.on('change', () => {
                this.tabContent[this.selectedTab] = this.editorInstance.getValue();
            });
        }
    }

    addTab(dbName: string, tableName: string) {
        const id = `${dbName}.${tableName}`;
        const tabIndex = this.tabs.findIndex((tab) => tab.id === id);

        if (tabIndex > -1) {
            this.selectTab(tabIndex);
            return;
        }

        this.tabs.push({
            id,
            dbName,
            tableName,
        });

        this.tabContent.push(`SELECT * FROM ${dbName}.${tableName};`);
        this.selectTab(this.tabs.length - 1);

        if (!this.editorInstance) {
            this.needsEditorInit = true;
        } else {
            this.editorInstance.setValue(this.tabContent[this.selectedTab]);
            this.triggerQuery = this.tabContent[this.selectedTab];
            this.selectedDB = dbName;
            this.currentTabId = id;
        }

        this.cdr.detectChanges();
        this.scrollTabIntoView(this.tabs.length - 1);
    }

    selectTab(tabIndex: number) {
        if (!this.tabContent[tabIndex]) {
            this.tabContent[tabIndex] = '';
        }

        this.selectedTab = tabIndex;
        this.selectedDB = this.tabs[tabIndex].dbName;
        this.triggerQuery = this.tabContent[tabIndex];
        this.currentTabId = this.tabs[tabIndex].id;

        if (this.editorInstance) {
            this.editorInstance.setValue(this.tabContent[tabIndex]);
        }
        this.executeTriggered = false;
        this.cdr.detectChanges();
        this.scrollTabIntoView(tabIndex);
    }

    scrollTabIntoView(tabIndex: number) {
        if (this.tabContainer && this.tabContainer.nativeElement) {
            const tabElement = this.tabContainer.nativeElement.children[tabIndex];
            if (tabElement) {
                tabElement.scrollIntoView({ behavior: 'smooth', inline: 'center' });
            }
        }
    }

    closeTab(tabIndex: number) {
        this.tabs.splice(tabIndex, 1);
        this.tabContent.splice(tabIndex, 1);
        this.selectedTab = this.tabs.length ? Math.max(0, tabIndex - 1) : -1;

        if (this.editorInstance && this.selectedTab >= 0) {
            this.editorInstance.setValue(this.tabContent[this.selectedTab]);
            this.triggerQuery = this.tabContent[this.selectedTab];
            this.selectedDB = this.tabs[this.selectedTab]?.dbName || '';
            this.currentTabId = this.tabs[this.selectedTab]?.id || '';
        } else {
            this.editorInstance?.toTextArea();
            this.editorInstance = null;
            this.needsEditorInit = true;
        }
    }

    handleExecQueryClick() {
        this.triggerQuery = this.tabContent[this.selectedTab];
        this.executeTriggered = true;
    }

    onDiscQueryClick() {
        if (this.editorInstance) {
            this.editorInstance.setValue('');
        }
        this.tabContent[this.selectedTab] = '';
        this.triggerQuery = '';
        this.executeTriggered = false;
    }
}
