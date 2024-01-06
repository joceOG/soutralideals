import React, { FC, useState } from 'react';
import { NavLink } from 'react-router-dom';
import IconButton from '@mui/material/IconButton';
import MenuIcon from '@mui/icons-material/Menu';
import FlexLogo from './FlexLogo';
import logo from '../assets/logo.png'
import Box from '@mui/material/Box';

const Navbar: FC = () => {
  const [showNavbar, setShowNavbar] = useState<boolean>(false);

  const handleShowNavbar = (): void => {
    setShowNavbar(!showNavbar);
  };

  return (
    <nav className="navbar">
    
    <div className="container2">
        
            <Box sx={{pt : 4 }}>
            <FlexLogo src={logo} alt='Logo' />
            </Box>

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
      </div>
    </nav>
  );
};

export default Navbar;

