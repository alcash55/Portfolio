import wkhs_lacrosse from "../../assets/images/wkhs_lacrosse.jpg";
import rmu_lacrosse from "../../assets/images/rmu_lacrosse.jpg";
import west_ms_coaching from "../../assets/images/west_ms_coaching.jpg";
// import white_water_rafting from "../../assets/images/white_water_rafting.jpg";
import joshua_tree from "../../assets/images/joshua_tree.jpg";
import troy_leon from "../../assets/images/troy_leon.jpg";
import {
  Box,
  Card,
  CardActionArea,
  CardContent,
  CardMedia,
  IconButton,
} from "@mui/material";
import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos";
import ArrowBackIosIcon from "@mui/icons-material/ArrowBackIos";
import { useState } from "react";

/**
 * @see https://mui.com/material-ui/react-stepper/#text-with-carousel-effect
 */
const SwipeableCards = () => {
  const [activeIndex, setActiveIndex] = useState<number>(0);

  const images = [
    { img: wkhs_lacrosse, alt: "Alex's college lacrosse commitment post " },
    { img: troy_leon, alt: "Alex's two dogs Troy (left) and Leon (right)" },
    { img: rmu_lacrosse, alt: "Alex playing lacrosse at RMU" },
    { img: west_ms_coaching, alt: "Alex coaching middle school lacrosse" },
    { img: joshua_tree, alt: "Alex at Joshua Tree National Park" },
  ];

  const handleLeftClick = () => {
    setActiveIndex((prevIndex) =>
      prevIndex === 0 ? images.length - 1 : prevIndex - 1
    );
  };

  const handleRightClick = () => {
    setActiveIndex((prevIndex) =>
      prevIndex === images.length - 1 ? 0 : prevIndex + 1
    );
  };

  const ImageCard = (
    <Card
      sx={{
        width: "100%",
        height: "100%",
        position: "relative",
        backgroundImage: `linear-gradient(90deg, hsla(221, 45%, 73%, 1) 0%, hsla(220, 78%, 29%, 1) 100%)`,
        border: "1px solid black",
        borderRadius: "1rem",
        borderWidth: "3px",
      }}
    >
      <CardContent
        sx={{
          position: "relative",
          width: "100%",
          height: "100%",
          p: 0,
          m: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <CardMedia
          component="img"
          src={images[activeIndex].img}
          alt={`${images[activeIndex].alt}`}
          sx={{
            width: "100%",
            height: "100%",
            objectFit: "scale-down",
            position: "absolute",
            top: 0,
            left: 0,
          }}
        />
        <CardActionArea
          aria-label="View the previous image"
          onClick={handleLeftClick}
          sx={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "50%",
            height: "100%",
            background: "rgba(0,0,0,0.2)", // Optional: semi-transparent overlay
            zIndex: 1, // Ensures it appears on top of the image
          }}
        />
        <CardActionArea
          aria-label="View the next image"
          onClick={handleRightClick}
          sx={{
            position: "absolute",
            top: 0,
            right: 0,
            width: "50%",
            height: "100%",
            background: "rgba(0,0,0,0.2)", // Optional: semi-transparent overlay
            zIndex: 1, // Ensures it appears on top of the image
          }}
        />
      </CardContent>
    </Card>
  );

  return (
    <Box
      sx={{
        width: "800px",
        height: "400px",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        flexDirection: "column",
        bgcolor: "black",
        p: 1,
        borderRadius: "1rem",
      }}
    >
      {ImageCard}
      <Box
        sx={{
          display: "flex",
          width: "100%",
          justifyContent: "space-evenly",
          alignItems: "center",
        }}
      >
        {/* Bottom Navigation */}
        <IconButton onClick={handleLeftClick} aria-label="left">
          <ArrowBackIosIcon />
        </IconButton>
        <IconButton onClick={handleRightClick} aria-label="right">
          <ArrowForwardIosIcon />
        </IconButton>
      </Box>
    </Box>
  );
};

export default SwipeableCards;
