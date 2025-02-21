declare module "*.jpg" {
  const value: string;
  export default value;
}

declare module "*.png" {
  const value: string;
  export default value;
}

declare module "*.svg" {
  import React from "react";
  const ReactComponent: React.FC<React.SVGProps<SVGSVGElement>>;
  export default ReactComponent;
}


declare module "*.gif" {
  const value: string;
  export default value;
}

declare module "*.webp" {
  const value: string;
  export default value;
}
