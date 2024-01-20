import React, { FC, useState } from 'react';
import { NavLink } from 'react-router-dom';
import IconButton from '@mui/material/IconButton';
import MenuIcon from '@mui/icons-material/Menu';
import FlexLogo from './FlexLogo';
import logo from '../assets/logo.png'
import Box from '@mui/material/Box';
import Grid from 'rsuite/esm/Row';
import Row from 'rsuite/esm/Row';
import Col from 'rsuite/esm/Col';
import Button, { ButtonProps } from '@mui/material/Button/Button';
import { styled} from '@mui/material/styles';
import SearchField from '../components/SearchField';

const Navbar: FC = () => {
  const [showNavbar, setShowNavbar] = useState<boolean>(false);

  const handleShowNavbar = (): void => {
    setShowNavbar(!showNavbar);
  };

  const ColorButton = styled(Button)<ButtonProps>(({ theme }) => ({
    height:30,
    width:170,
    color:  theme.palette.secondary.contrastText ,
    borderRadius:45,
    backgroundColor: theme.palette.secondary.main,
    '&:hover': {
      backgroundColor: theme.palette.primary.main,
    },
  }));
  

  interface SearchFieldProps {
    onSearch: (query: string) => void;
  }

  return (
    <nav className="navbar">
    
    <div className="container2">
          
        <Row className='rowNav'>

           <Col xs={16}  sm={8}  md={4} lg={8} style={{ paddingRight: 20 , paddingTop:46 , paddingLeft:35 , paddingBottom: 20  , height: 120  }}> 
           <FlexLogo src={logo} alt='Logo' />
           </Col>
            
           <Col xs={16}  sm={8}  md={4} lg={8} style={ { paddingRight: 20 , paddingTop:50  , paddingLeft:20 , paddingBottom: 20 , height: 120 }}>
           <ColorButton><b><h6>Déposer une annonce</h6></b></ColorButton>
           </Col>

           <Col xs={16}  sm={8}  md={4} lg={8} style={ { paddingRight: 20 , paddingLeft:20 , paddingTop:50 , paddingBottom: 20 , height: 120 }}>
           <SearchField onSearch={function (query: string): void {
                       return console.log('Search ', query);
                      }}></SearchField>  
           </Col>
            
           <Col xs={16}  sm={8}  md={4} lg={8} style={ { paddingRight: 20 , paddingLeft:20 , paddingTop:30 , paddingBottom: 20 , height: 120 }}>
           
           </Col>

        </Row>


        <div className="menu-icon" onClick={handleShowNavbar}>
           <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
          >
            <MenuIcon />
            </IconButton>
        </div>
    </div>
    <br></br>
    <div className="container">
        <div className={`nav-elements  ${showNavbar && 'active'}`}>
          <ul>
            <li>
              <NavLink to="/">Accueil</NavLink>
            </li>
            <li>
              <NavLink to="/Reservations">Réservations</NavLink>
            </li>
            <li>
              <NavLink to="/Services">Services</NavLink>
            </li>
            <li>
              <NavLink to="/Apropos">A Propos</NavLink>
            </li>
            <li>
              <NavLink to="/Contacts">Contacts</NavLink>
            </li>
          </ul>
        </div>
        <br></br>
      </div>
      
    </nav>
  );
};

export default Navbar;

