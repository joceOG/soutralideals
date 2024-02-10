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
import Typography from '@mui/material/Typography';
import Popover from '@mui/material/Popover';

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


//pop menu 1
  const [anchorEl, setAnchorEl] = React.useState<HTMLElement | null>(null);

  const handlePopoverOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handlePopoverClose = () => {
    setAnchorEl(null);

  //pop menu 2
  

  };

  const open = Boolean(anchorEl);
//pop menu fin 1


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
              <NavLink to="/">
              <Typography
        aria-owns={open ? 'mouse-over-popover' : undefined}
        aria-haspopup="true"
        onMouseEnter={handlePopoverOpen}
        onMouseLeave={handlePopoverClose}
      >
                nos métiers/services
                
                </Typography>
                <Popover
        id="mouse-over-popover"
        sx={{
          pointerEvents: 'none',
        }}
        open={open}
        anchorEl={anchorEl}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'left',
        }}
        onClose={handlePopoverClose}
        disableRestoreFocus
      >
        <Typography sx={{ p: 1 }}>techniques et artisanaux</Typography>

        <Typography sx={{ p: 1 }}>immobilier neuf</Typography>

        <Typography sx={{ p: 1 }}>per </Typography>

        <Typography sx={{ p: 1 }}>collocation</Typography>

        <Typography sx={{ p: 1 }}>bureau et commerce</Typography>

      </Popover>
                </NavLink> 

            </li>

            <li>
              <NavLink to="/Reservations">
                <Typography>freelance/corporate</Typography>
                </NavLink>
            </li>
            <li>
              <NavLink to="/Services">E-marché</NavLink>
            </li>
            <li>
              <NavLink to="/Apropos">Autre</NavLink>
            </li>
          </ul>
        </div>
        <br></br>
      </div>
      
    </nav>
  );
};

export default Navbar;

