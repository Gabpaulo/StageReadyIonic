import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import { AppModule } from './app/app.module';

// ✅ Import and register Swiper web components globally
import { register } from 'swiper/element/bundle';
register();  // This enables <swiper-container> and <swiper-slide>

platformBrowserDynamic()
  .bootstrapModule(AppModule)
  .catch(err => console.log(err));
