import { Component, ViewChild } from '@angular/core';
import { CargoService } from "./cargo.service";
import { Box } from "./box";
import { Renderer } from "./renderer";

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'Super Cargo Packer 8023';

  constructor(private cargoService: CargoService) { }

  boxes: Box[];

  @ViewChild("canvas") canvas;

  renderer: Renderer;

  ngAfterViewInit() :void {
    this.renderer = new Renderer( this.canvas.nativeElement )
    if(this.boxes) this.renderer.setBoxes( JSON.parse(JSON.stringify(this.boxes)) )
  }

  getBoxes(): void {
    this.cargoService.getBoxes()
      .subscribe(boxes => {
        this.boxes = boxes
        if(this.renderer) this.renderer.setBoxes( JSON.parse(JSON.stringify(this.boxes)) )
      });
  }

  ngOnInit(): void {
    this.getBoxes();
  }

  updateBoxes(): void {
    this.cargoService.setBoxes(this.boxes)
  }
}
