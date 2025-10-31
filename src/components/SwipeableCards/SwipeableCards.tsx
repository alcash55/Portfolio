import wkhs_lacrosse from "../../assets/images/wkhs_lacrosse.jpg";
import rmu_lacrosse from "../../assets/images/rmu_lacrosse.jpg";
import west_ms_coaching from "../../assets/images/west_ms_coaching.jpg";
import joshua_tree from "../../assets/images/joshua_tree.jpg";
import troy_leon from "../../assets/images/troy_leon.jpg";
import {
  Box,
  Card,
  CardActionArea,
  CardContent,
  CardMedia,
  IconButton,
  useMediaQuery,
  useTheme,
  Chip,
} from "@mui/material";
import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos";
import ArrowBackIosIcon from "@mui/icons-material/ArrowBackIos";
import { useState } from "react";

/**
 * @see https://mui.com/material-ui/react-stepper/#text-with-carousel-effect
 */
const SwipeableCards = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const isTablet = useMediaQuery(theme.breakpoints.down("md"));
  const [activeIndex, setActiveIndex] = useState<number>(0);

  const images = [
    {
      img: troy_leon,
      alt: "Alex's two dogs Troy (left) and Leon (right)",
      title: "Family Life",
    },
    {
      img: rmu_lacrosse,
      alt: "Alex playing lacrosse at RMU",
      title: "Division I Athletics",
    },
    {
      img: west_ms_coaching,
      alt: "Alex coaching middle school lacrosse",
      title: "Coaching & Leadership",
    },
    {
      img: joshua_tree,
      alt: "Alex at Joshua Tree National Park",
      title: "Adventure & Travel",
    },
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

  // Calculate responsive dimensions
  const getDimensions = () => {
    if (isMobile) {
      return { width: "100%", height: "250px" };
    } else if (isTablet) {
      return { width: "100%", height: "350px" };
    }
    return { width: "600px", height: "400px" };
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
        // overflow: "hidden",
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
          alt={images[activeIndex].alt}
          loading="eager"
          sx={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            position: "absolute",
            top: 0,
            left: 0,
          }}
        />
        {/* Image overlay for better clickability indication */}
        <Box
          onClick={handleLeftClick}
          aria-label="View the previous image"
          sx={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "50%",
            height: "100%",
            cursor: "pointer",
            zIndex: 1,
            "&:hover": {
              background: "rgba(0,0,0,0.1)",
            },
          }}
        />
        <Box
          onClick={handleRightClick}
          aria-label="View the next image"
          sx={{
            position: "absolute",
            top: 0,
            right: 0,
            width: "50%",
            height: "100%",
            cursor: "pointer",
            zIndex: 1,
            "&:hover": {
              background: "rgba(0,0,0,0.1)",
            },
          }}
        />
        {/* Title overlay */}
        <Box
          sx={{
            position: "absolute",
            bottom: 16,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 2,
          }}
        >
          <Chip
            label={images[activeIndex].title}
            sx={{
              bgcolor: "rgba(0, 0, 0, 0.7)",
              color: "white",
              fontWeight: "bold",
            }}
          />
        </Box>
      </CardContent>
    </Card>
  );

  const dimensions = getDimensions();

  return (
    <Box
      sx={{
        width: dimensions.width,
        height: dimensions.height,
        maxWidth: "100%",
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
          mt: 1,
          gap: 1,
        }}
      >
        {/* Dots indicator */}
        <Box sx={{ display: "flex", gap: 0.5 }}>
          {images.map((_, idx) => (
            <Box
              key={idx}
              onClick={() => setActiveIndex(idx)}
              sx={{
                width: activeIndex === idx ? 24 : 8,
                height: 8,
                borderRadius: "4px",
                bgcolor:
                  activeIndex === idx
                    ? "primary.main"
                    : "rgba(255, 255, 255, 0.3)",
                cursor: "pointer",
                transition: "all 0.3s ease",
                "&:hover": {
                  bgcolor:
                    activeIndex === idx
                      ? "primary.main"
                      : "rgba(255, 255, 255, 0.5)",
                },
              }}
            />
          ))}
        </Box>
        {/* Navigation buttons */}
        {/* <IconButton
          onClick={handleLeftClick}
          aria-label="Previous image"
          sx={{ color: "white" }}
        >
          <ArrowBackIosIcon />
        </IconButton>
        <IconButton
          onClick={handleRightClick}
          aria-label="Next image"
          sx={{ color: "white" }}
        >
          <ArrowForwardIosIcon />
        </IconButton> */}
      </Box>
    </Box>
  );
};

export default SwipeableCards;
