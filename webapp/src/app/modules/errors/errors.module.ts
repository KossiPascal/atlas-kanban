import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { ErrorsRoutingModule } from './errors-routing.module';
import { ErrorPageComponent } from './error-page.component';

@NgModule({
  declarations: [
    ErrorPageComponent
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ErrorsRoutingModule
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],

})
export class ErrorsModule { }
