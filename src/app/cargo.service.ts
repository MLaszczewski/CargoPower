import { Injectable } from '@angular/core';
import { Observable } from 'rxjs/Observable';
import { BehaviorSubject } from 'rxjs/BehaviorSubject';
import { of } from 'rxjs/observable/of';

import { BOXES } from './mock-boxes';
import { Box } from './box'

@Injectable()
export class CargoService {

  boxes: BehaviorSubject<Box[]>

  constructor() {
    this.boxes = new BehaviorSubject(BOXES)
  }

  getBoxes(): Observable<Box[]> {
    return this.boxes
  }

  setBoxes(boxes:Box[]) {
    this.boxes.next(boxes)
  }

}
