"use client";
import { useTexture, Sphere } from "@react-three/drei";


export const EarthTextured = ({ clickedHandler }: { clickedHandler: (e: any) => void; }) => {
  const bump2 = useTexture("./textures/earthbump1k.jpg");
  const earth_jpg = useTexture("./textures/earthmap1k (1).jpg");

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
    <Sphere args={[0.7, 64, 64]} castShadow onClick={(e) => {
      e.stopPropagation();
      const point = e.point;
      const coords = cartesianToLatLng(point.x, point.y, point.z);
      clickedHandler(coords);
    }}>
      <meshStandardMaterial map={earth_jpg} side={2}
        color={"#ffffff"} emissive={"#112233"}
        displacementScale={.24} displacementMap={bump2} />
    </Sphere>
  </>);
};
