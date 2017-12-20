
export class Vector {
  x: number;
  y: number;
  z: number;
}

export class Color {
  r: number;
  g: number;
  b: number;
}

export class Box {
  id: number;
  public position: Vector;
  public size: Vector;
  public color: Color;
}
