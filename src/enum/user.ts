export enum ENUM_USER_ROLE {
    ADMIN = 'admin',
    USER="user"
  }
  
  export const RoleWiseUserValue = {
    
    [ENUM_USER_ROLE.ADMIN]: 95,
    [ENUM_USER_ROLE.USER]: 90,
    
  };
  
  export enum ENUM_COOKIE_NAME {
    REFRESH_TOKEN = 'EcommerceJwt',
  }
  
  export type DiskTypeEnum = 'LOCAL' | 'AWS' | 'SHARED';
  
  export type GeoLocationTypeEnum = 'Point' | 'Polygon';
  
  export const allGeoLocationTypeEnum: GeoLocationTypeEnum[] = [
    'Point',
    'Polygon',
  ];
  