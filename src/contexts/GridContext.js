import React, { useContext } from "react";

import Vector2 from "../helpers/Vector2";
import Size from "../helpers/Size";
// eslint-disable-next-line no-unused-vars
import { getGridPixelSize, getCellPixelSize, Grid } from "../helpers/grid";

/**
 * @typedef GridContextValue
 * @property {Grid} grid Base grid value
 * @property {Size} gridPixelSize Size of the grid in pixels
 * @property {Size} gridCellPixelSize Size of each cell in pixels
 * @property {Size} gridCellNormalizedSize Size of each cell normalized to the grid
 * @property {Vector2} gridOffset Offset of the grid from the top left in pixels
 * @property {number} gridStrokeWidth Stroke width of the grid in pixels
 */

/**
 * @type {GridContextValue}
 */
const defaultValue = {
  grid: {
    size: new Vector2(0, 0),
    inset: { topLeft: new Vector2(0, 0), bottomRight: new Vector2(1, 1) },
    type: "square",
  },
  gridPixelSize: new Size(0, 0),
  gridCellPixelSize: new Size(0, 0, 0),
  gridCellNormalizedSize: new Size(0, 0, 0),
  gridOffset: new Vector2(0, 0),
  gridStrokeWidth: 0,
};

const GridContext = React.createContext(defaultValue);

const defaultStrokeWidth = 1 / 10;

export function GridProvider({ grid, width, height, children }) {
  if (!grid?.size.x || !grid?.size.y) {
    return (
      <GridContext.Provider value={defaultValue}>
        {children}
      </GridContext.Provider>
    );
  }

  const gridPixelSize = getGridPixelSize(grid, width, height);
  const gridCellPixelSize = getCellPixelSize(
    grid,
    gridPixelSize.width,
    gridPixelSize.height
  );
  const gridCellNormalizedSize = new Size(
    gridCellPixelSize.width / gridPixelSize.width,
    gridCellPixelSize.height / gridPixelSize.height
  );
  const gridOffset = Vector2.multiply(grid.inset.topLeft, {
    x: width,
    y: height,
  });
  const gridStrokeWidth =
    (gridCellPixelSize.width < gridCellPixelSize.height
      ? gridCellPixelSize.width
      : gridCellPixelSize.height) * defaultStrokeWidth;

  const value = {
    grid,
    gridPixelSize,
    gridCellPixelSize,
    gridCellNormalizedSize,
    gridOffset,
    gridStrokeWidth,
  };

  return <GridContext.Provider value={value}>{children}</GridContext.Provider>;
}

export function useGrid() {
  const context = useContext(GridContext);
  if (context === undefined) {
    throw new Error("useGrid must be used within a GridProvider");
  }
  return context;
}

export default GridContext;
