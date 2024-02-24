import { width } from '@mui/system';
import { FC } from 'react';
import styled from 'styled-components' ;
interface FlexLogoProps {
  src: string;
  alt: string;
}

const FlexImage = styled.img 
    
    ;


const FlexLogo: FC<FlexLogoProps> = ({ src, alt }) => {
  return <img src={src} alt={alt} />;
};

export default FlexLogo;
