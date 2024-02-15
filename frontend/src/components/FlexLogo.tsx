import React, { FC } from 'react';

interface FlexLogoProps {
  src: string;
  alt: string;
}

const FlexLogo: FC<FlexLogoProps> = ({ src, alt }) => {
  return <img src={src} alt={alt} />;
};

export default FlexLogo;
