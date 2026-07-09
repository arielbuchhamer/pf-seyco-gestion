import { HttpInterceptorFn } from '@angular/common/http';

// El JWT viaja en una cookie httpOnly: el browser la adjunta solo si la request
// se hace con credentials incluidas. Centralizado acá para no repetirlo en cada llamada.
export const credentialsInterceptor: HttpInterceptorFn = (req, next) =>
  next(req.clone({ withCredentials: true }));
