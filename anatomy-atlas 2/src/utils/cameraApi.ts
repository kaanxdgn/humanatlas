/**
 * CameraRig'in kaydettiği, React dışı kamera kontrol köprüsü (ZoomBar kullanır).
 * Mesafe: kamera ile OrbitControls hedefi arasındaki uzaklık (metre).
 */
export const ZOOM_MIN = 0.9;
export const ZOOM_MAX = 9;

export const cameraApi: {
  getDistance: () => number;
  setDistance: (d: number) => void;
} = {
  getDistance: () => 4.5,
  setDistance: () => undefined,
};
