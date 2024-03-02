import  { FC } from 'react';
import styled from 'styled-components';

interface FlexibleImageProps {
  src: string;
  alt: string;
}

const FlexImageSlick = styled.img`
  max-width: 100%;
  width: 80;
  height: 100;
`;

const FlexibleImageSlick: FC<FlexibleImageProps> = ({ src, alt }) => {
  return <FlexImageSlick src={src} alt={alt}> 
  </FlexImageSlick>
  ;
};

export default FlexibleImageSlick;