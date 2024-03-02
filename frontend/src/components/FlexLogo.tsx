import  { FC } from 'react';
import styled from 'styled-components';

interface FlexibleImageProps {
  src: string;
  alt: string;
}

const FlexImage = styled.img`
  width: 160px;
  height: 28px;
`;

const FlexLogo: FC<FlexibleImageProps> = ({ src, alt }) => {
  return <FlexImage src={src} alt={alt}> 
  </FlexImage>
  ;
};

export default FlexLogo;