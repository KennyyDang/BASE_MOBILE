declare module 'jwt-decode' {
  export interface JwtDecodeOptions {
    header?: boolean;
  }

  export function jwtDecode<T = unknown>(
    token: string,
    options?: JwtDecodeOptions
  ): T;
}


