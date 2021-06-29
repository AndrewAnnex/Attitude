import h from "@macrostrat/hyper";
import { Orientation, getColor } from "@attitude/core";
import { Stereonet } from "@attitude/notebook-ui/src";
import ReactDataSheet from "react-datasheet";
import "react-datasheet/lib/react-datasheet.css";
import update, { Spec } from "immutability-helper";
import { Button, ButtonGroup } from "@blueprintjs/core";
import { useStoredState } from "@macrostrat/ui-components/lib/esm/util/local-storage";
import { ErrorBoundary } from "@macrostrat/ui-components/lib/esm/error-boundary";
import JSONTree from "react-json-tree";
//import { SwatchesPicker } from "react-color";
//import classNames from "classnames";
interface GridElement extends ReactDataSheet.Cell<GridElement, number> {
  value: number | null;
}

class OrientationDataSheet extends ReactDataSheet<GridElement, number> {}
type SheetContent = GridElement[][];

const defaultOrientations: Orientation[] = [
  { strike: 10, dip: 8, rake: 2, maxError: 20, minError: 8, color: "#65499e" },
  {
    strike: 120,
    dip: 46,
    rake: 5,
    maxError: 45,
    minError: 2,
    color: "dodgerblue"
  }
];

interface Field<Key> {
  name: string;
  key: Key;
  required?: boolean;
  isValid?(k: any): boolean;
  transform?(k: any): any;
}

type OrientationKey =
  | "strike"
  | "dip"
  | "rake"
  | "maxError"
  | "minError"
  | "color";

const orientationFields: Field<OrientationKey>[] = [
  { name: "Strike", key: "strike" },
  { name: "Dip", key: "dip" },
  { name: "Rake", key: "rake" },
  { name: "Max.", key: "maxError", category: "Errors" },
  { name: "Min.", key: "minError", category: "Errors" },
  {
    name: "Color",
    key: "color",
    required: false,
    isValid: d => getColor(d) != null,
    transform: d => d
  }
];

function transformData(data: Orientation): GridElement[] {
  return orientationFields.map(d => {
    return { value: data[d.key] ?? null, className: "test" };
  });
}

function addEmptyRows(
  data: SheetContent,
  modulus: number = 10,
  targetN = 0
): SheetContent {
  const nToAdd =
    Math.ceil((data.length + targetN) / modulus) * modulus - data.length;
  if (nToAdd <= 0) return data;
  const emptyData = Array(orientationFields.length).fill({ value: null });
  const addedRows = Array(nToAdd).fill(emptyData);
  return [...data, ...addedRows];
}

function Columns() {
  return h("colgroup", [
    h("col.index-column", { key: "index" }),
    orientationFields.map(({ key }) => {
      return h("col", {
        className: key,
        key
      });
    })
  ]);
}

function Row(props) {
  const { children, row } = props;
  return h("tr", [h("td.index-cell.cell.read-only.index", row), children]);
}

function Header() {
  return h("thead", [
    h("tr.header", [
      h("td.index-column.cell.read-only", ""),
      orientationFields.map((col, index) => {
        return h(
          "td.cell.header.read-only.header-cell",
          {
            key: col.key,
            index
          },
          col.name
        );
      })
    ])
  ]);
}

function Sheet({ className, children }) {
  return h("table", { className }, [
    h(Columns),
    h(Header),
    h("tbody", children)
  ]);
}

function getFieldData<K>(field: Field<K>): Field<K> {
  const {
    transform = d => parseFloat(d),
    isValid = d => !isNaN(d),
    required = true,
    ...rest
  } = field;
  return { ...rest, transform, isValid, required };
}

function DataArea({ data, updateData }) {
  return h("div.data-area", [
    h(
      "p.instructions",
      "Enter data here. Use degrees for orientations, and html colors (string, rgba, or hex codes). Pasting from a spreadsheet should work!"
    ),
    h(
      ErrorBoundary,
      null,
      h(ReactDataSheet, {
        data,
        valueRenderer: (cell, row, col) => {
          return cell.value;
        },
        rowRenderer: Row,
        sheetRenderer: Sheet,
        attributesRenderer(cell, row, col) {
          if (cell.value == null) return { "data-status": "empty" };
          const { isValid } = getFieldData(orientationFields[col]);
          const status = isValid(cell.value) ? "ok" : "invalid";
          return { "data-status": status };
        },
        onContextMenu: (...args) => {
          console.log("Context menu");
          console.log(args);
        },
        onCellsChanged: changes => {
          let spec: Spec<SheetContent> = {};
          changes.forEach(({ cell, row, col, value }) => {
            if (!(row in spec)) spec[row] = {};
            spec[row][col] = { $set: { value } };
          });
          updateData(update(data, spec));
        }
      })
    ),
    //h(SwatchesPicker),
    h("div.controls", [
      h(ButtonGroup, [
        h(
          Button,
          {
            onClick() {
              updateData(addEmptyRows(data, 10, 10));
            }
          },
          "Add more rows"
        ),
        h(
          Button,
          {
            onClick() {
              updateData(defaultData);
            }
          },
          "Reset data"
        )
      ])
    ])
  ]);
}

const defaultData = addEmptyRows(defaultOrientations.map(transformData), 10);

function constructOrientation(row): Orientation {
  // Construct an orientation from a row
  let ix = 0;
  let orientation: Partial<Orientation> = {};
  for (const field of orientationFields) {
    const { transform, isValid, required } = getFieldData(field);

    // Validation
    let val = transform(row[ix].value);
    const valid = isValid(val);
    if (required && !valid) return null;
    if (valid) {
      orientation[field.key] = val;
    }
    ix++;
  }
  return orientation as Orientation;
}

export function App() {
  const [data, setState] = useStoredState<SheetContent>(
    "orientation-data",
    defaultData
  );

  const cleanedData: Orientation[] = data
    .map(constructOrientation)
    .filter(d => d != null);

  return h("div.app", [
    h("h1", "Uncertain orientations plotter"),
    h("div.main", [
      h(DataArea, { data, updateData: setState }),
      h(
        "div.plot-area",
        null,
        h(Stereonet, {
          data: cleanedData,
          margin: 50,
          drawPoles: true,
          drawPlanes: false
        })
      )
    ])
  ]);
}
