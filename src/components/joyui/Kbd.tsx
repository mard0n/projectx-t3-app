import * as React from "react";
import { Typography, type TypographyProps } from "@mui/joy";

type KbdProps = TypographyProps;

const Kbd: React.FC<KbdProps> = ({ children, ...props }) => {
  return (
    <Typography
      component="kbd"
      textColor="text.primary"
      sx={{
        fontFamily: "monospace",
        fontSize: "xs",
        fontWeight: "lg",
        borderColor: "var(--joy-palette-background-level3)",
        borderStyle: "solid",
        borderWidth: "1px 1px 3px",
        backgroundColor: "background.level4",
        borderRadius: "0.35rem",
        px: 0.5,
        py: 0,
      }}
      {...props}
    >
      {children}
    </Typography>
  );
};

export default Kbd;
