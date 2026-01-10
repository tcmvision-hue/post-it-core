import desktopImage from "../../assets/frontpage-desktop-16x9.jpg";
import mobileImage from "../../assets/frontpage-mobile-9x16.jpg";

export default function Frontpage() {
  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        overflow: "hidden",
        backgroundColor: "#000",
      }}
    >
      <picture>
        {/* Mobiel 9:16 */}
        <source
          media="(max-width: 768px)"
          srcSet={mobileImage}
        />

        {/* Desktop 16:9 */}
        <img
          src={desktopImage}
          alt=""
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            display: "block",
          }}
        />
      </picture>
    </div>
  );
}
