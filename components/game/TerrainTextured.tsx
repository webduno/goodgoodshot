"use client";
import { useTexture, Sphere, Plane } from "@react-three/drei";


export const TerrainTextured = ({ clickedHandler }: { clickedHandler: (e: any) => void; }) => {
  const bump2 = useTexture("./textures/heightmap(9).png");
  // const bump2 = useTexture("./textures/bump2.jpg");
  // const earth_jpg = useTexture("./textures/earthmap1k.jpg");
  const earth_jpg = useTexture("./textures/heightmap(2).png");

  const cartesianToLatLng = (x: number, y: number, z: number) => {
    const radius = Math.sqrt(x * x + y * y + z * z);
    // Normalize coordinates
    const nx = x / radius;
    const ny = y / radius;
    const nz = z / radius;

    // Calculate latitude (-90 to 90)
    const lat = Math.asin(ny) * 180 / Math.PI;

    // Calculate longitude (-180 to 180)
    let lng = Math.atan2(nz, nx) * 180 / Math.PI;
    lng = lng - 90; // Adjust to match the texture mapping


    // Ensure longitude is in -180 to 180 range
    if (lng > 180) lng -= 360;
    if (lng < -180) lng += 360;

    return { lat, lng };
  };

  return (<>
    <Plane args={[120, 80,64,64]} castShadow onClick={(e: any) => {
      e.stopPropagation();
      const point = e.point;
      const coords = cartesianToLatLng(point.x, point.y, point.z);
      clickedHandler(coords);
    }}>
      <meshStandardMaterial map={earth_jpg} 
        color={"#aaaaaa"} 
        displacementScale={60} displacementMap={bump2} />
    </Plane>
  </>);
};



export const AvilaTerrainTextured = ({ clickedHandler }: { clickedHandler: (e: any) => void; }) => {
  const bump2 = useTexture("./textures/avilaheightmap - copia.png");
  // const bump2 = useTexture("./textures/bump2.jpg");
  // const earth_jpg = useTexture("./textures/earthmap1k.jpg");
  const earth_jpg = useTexture("./textures/avldown.png");

  const cartesianToLatLng = (x: number, y: number, z: number) => {
    const radius = Math.sqrt(x * x + y * y + z * z);
    // Normalize coordinates
    const nx = x / radius;
    const ny = y / radius;
    const nz = z / radius;

    // Calculate latitude (-90 to 90)
    const lat = Math.asin(ny) * 180 / Math.PI;

    // Calculate longitude (-180 to 180)
    let lng = Math.atan2(nz, nx) * 180 / Math.PI;
    lng = lng - 90; // Adjust to match the texture mapping


    // Ensure longitude is in -180 to 180 range
    if (lng > 180) lng -= 360;
    if (lng < -180) lng += 360;

    return { lat, lng };
  };

  return (<>
    <Plane args={[120, 80,64,64]} castShadow onClick={(e: any) => {
      e.stopPropagation();
      const point = e.point;
      const coords = cartesianToLatLng(point.x, point.y, point.z);
      clickedHandler(coords);
    }}>
      <meshStandardMaterial map={earth_jpg} 
        color={"#aaaaaa"} 
        displacementScale={60} displacementMap={bump2} />
    </Plane>
  </>);
};



export const MapTerrainTextured = ({ clickedHandler }: { clickedHandler: (e: any) => void; }) => {
  const bump2 = useTexture("./textures/map.png");
  // const bump2 = useTexture("./textures/bump2.jpg");
  // const earth_jpg = useTexture("./textures/earthmap1k.jpg");
  const earth_jpg = useTexture("./textures/mapt.png");

  const cartesianToLatLng = (x: number, y: number, z: number) => {
    const radius = Math.sqrt(x * x + y * y + z * z);
    // Normalize coordinates
    const nx = x / radius;
    const ny = y / radius;
    const nz = z / radius;

    // Calculate latitude (-90 to 90)
    const lat = Math.asin(ny) * 180 / Math.PI;

    // Calculate longitude (-180 to 180)
    let lng = Math.atan2(nz, nx) * 180 / Math.PI;
    lng = lng - 90; // Adjust to match the texture mapping


    // Ensure longitude is in -180 to 180 range
    if (lng > 180) lng -= 360;
    if (lng < -180) lng += 360;

    return { lat, lng };
  };

  return (<>
    <Plane args={[120, 80,64,64]} castShadow receiveShadow onClick={(e: any ) => {
      e.stopPropagation();
      const point = e.point;
      const coords = cartesianToLatLng(point.x, point.y, point.z);
      clickedHandler(coords);
    }}>
      <meshStandardMaterial map={earth_jpg} 
      
        // color={"#777777"} 
        displacementScale={50} displacementMap={bump2} />
    </Plane>
  </>);
};
