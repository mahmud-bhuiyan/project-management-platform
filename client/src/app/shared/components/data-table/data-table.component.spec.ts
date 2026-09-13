import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { DataTableComponent } from './data-table.component';
import { DataTableRowDirective } from './data-table-row.directive';

@Component({
  template: `
    <app-data-table
      title="Items"
      [columns]="[
        {
          id: 'name',
          label: 'Name',
          headerAlign: 'left',
          cellAlign: 'left'
        }
      ]"
      [items]="items"
      [totalCount]="items.length"
      [filteredCount]="items.length"
      [pageSummary]="{ start: 1, end: 1, total: 1 }"
      [pageSize]="20"
      (searchChange)="onSearch($event)"
      (pageChange)="onPageChange($event)"
      (pageSizeChange)="onPageSizeChange($event)"
    >
      <ng-template appDataTableRow let-item let-columnCellClass="columnCellClass">
        <td [class]="columnCellClass('name')">{{ item.name }}</td>
      </ng-template>
    </app-data-table>
  `,
  imports: [DataTableComponent, DataTableRowDirective],
})
class DataTableHostComponent {
  items = [{ id: '1', name: 'Alpha' }];
  lastSearch = '';
  lastPage = 1;
  lastPageSize = 20;

  onSearch(value: string): void {
    this.lastSearch = value;
  }

  onPageChange(page: number): void {
    this.lastPage = page;
  }

  onPageSizeChange(size: number): void {
    this.lastPageSize = size;
  }
}

describe('DataTableComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DataTableHostComponent],
    }).compileComponents();
  });

  it('renders rows from the row template', () => {
    const fixture = TestBed.createComponent(DataTableHostComponent);
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Alpha');
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Name');
  });

  it('emits search changes', () => {
    const fixture = TestBed.createComponent(DataTableHostComponent);
    fixture.detectChanges();

    const input = (fixture.nativeElement as HTMLElement).querySelector(
      'input[type="search"]',
    ) as HTMLInputElement;
    input.value = 'alpha';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(fixture.componentInstance.lastSearch).toBe('alpha');
  });

  it('applies optional table config classes', () => {
    @Component({
      template: `
        <app-data-table
          title="Items"
          [columns]="[{ id: 'name', label: 'Name' }]"
          [items]="items"
          [totalCount]="1"
          [filteredCount]="1"
          [pageSummary]="{ start: 1, end: 1, total: 1 }"
          [config]="{ showColumnBorders: false, stripedRows: true }"
        >
          <ng-template appDataTableRow let-item>
            <td>{{ item.name }}</td>
          </ng-template>
        </app-data-table>
      `,
      imports: [DataTableComponent, DataTableRowDirective],
    })
    class ConfigHostComponent {
      items = [{ id: '1', name: 'Alpha' }];
    }

    const fixture = TestBed.createComponent(ConfigHostComponent);
    fixture.detectChanges();

    const table = (fixture.nativeElement as HTMLElement).querySelector('.data-table');
    expect(table?.classList.contains('data-table--bordered')).toBe(false);
    expect(table?.classList.contains('data-table--striped')).toBe(true);
  });

  it('hides page navigation when all rows fit on one page', () => {
    const fixture = TestBed.createComponent(DataTableHostComponent);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Rows per page');
    expect(compiled.textContent).not.toContain('First');
    expect(compiled.textContent).not.toContain('Previous');
    expect(compiled.textContent).not.toContain('Next');
    expect(compiled.textContent).not.toContain('Last');
    expect(compiled.querySelector('.data-table-pagination__controls')).toBeNull();
  });

  it('renders pagination controls and emits page size changes', () => {
    @Component({
      template: `
        <app-data-table
          title="Items"
          [columns]="[{ id: 'name', label: 'Name' }]"
          [items]="items"
          [totalCount]="items.length"
          [filteredCount]="items.length"
          [pageSummary]="{ start: 1, end: 20, total: 25 }"
          [totalPages]="2"
          [pageSize]="20"
          (pageSizeChange)="onPageSizeChange($event)"
        >
          <ng-template appDataTableRow let-item>
            <td>{{ item.name }}</td>
          </ng-template>
        </app-data-table>
      `,
      imports: [DataTableComponent, DataTableRowDirective],
    })
    class PaginatedHostComponent {
      items = Array.from({ length: 20 }, (_, index) => ({
        id: String(index + 1),
        name: `Item ${index + 1}`,
      }));
      lastPageSize = 20;

      onPageSizeChange(size: number): void {
        this.lastPageSize = size;
      }
    }

    const fixture = TestBed.createComponent(PaginatedHostComponent);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Rows per page');
    expect(compiled.textContent).toContain('First');
    expect(compiled.textContent).toContain('Last');

    const pageSizeSelect = compiled.querySelector(
      '.data-table-page-size__select',
    ) as HTMLSelectElement;
    pageSizeSelect.value = '50';
    pageSizeSelect.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    expect(fixture.componentInstance.lastPageSize).toBe(50);
  });
});
