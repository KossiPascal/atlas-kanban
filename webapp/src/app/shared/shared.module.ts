import { CommonModule } from "@angular/common";
import { NgModule, CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA } from "@angular/core";
import { SafeHtmlPipe } from "../pipes/safe-html.pipe";


@NgModule({
  declarations: [
    SafeHtmlPipe,
  ],
  imports: [
    CommonModule
  ],
  exports: [
    SafeHtmlPipe,
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA],
})
export class SharedModule { }
