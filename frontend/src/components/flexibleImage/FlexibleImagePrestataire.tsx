import  { FC } from 'react';
import styled from 'styled-components';

interface FlexibleImagePrestataireProps {
  src: string;
  alt: string;
}

const FlexImagePrestataire = styled.img`
  width: 25px;
  padding: 10px 0px 10px 0px ;
`;

const FlexibleImagePrestataire: FC<FlexibleImagePrestataireProps> = ({ src, alt }) => {
  return <FlexImagePrestataire src={src} alt={alt}> 
  </FlexImagePrestataire>
  ;
};

export default FlexibleImagePrestataire;