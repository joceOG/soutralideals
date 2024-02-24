import React, { FC, useState } from 'react';
import { NavLink } from 'react-router-dom';
import IconButton from '@mui/material/IconButton';
import MenuIcon from '@mui/icons-material/Menu';
import FlexLogo from './FlexLogo'; 
import logo from '../assets/logo.png';
//import Box from '@mui/material/Box';
import {Row, Col } from 'rsuite';
import Button, { ButtonProps } from '@mui/material/Button/Button';
import { styled } from '@mui/material/styles';
import SearchField from '../components/SearchField';
import Typography from '@mui/material/Typography';
import Popover from '@mui/material/Popover';

const Navbar: FC = () => {
  const [showNavbar, setShowNavbar] = useState<boolean>(false);
  const [anchorE1, setAnchorE1] = useState<HTMLElement | null>(null);
  const [anchorE2, setAnchorE2] = useState<HTMLElement | null>(null);
  const [anchorE3, setAnchorE3] = useState<HTMLElement | null>(null);
  const [anchorE4, setAnchorE4] = useState<HTMLElement | null>(null);

  const handleShowNavbar = (): void => {
    setShowNavbar(!showNavbar);
  };

  const ColorButton = styled(Button)<ButtonProps>(({ theme }) => ({
    height: 30,
    width: 170,
    color: theme.palette.secondary.contrastText,
    borderRadius: 45,
    backgroundColor: theme.palette.secondary.main,
    '&:hover': {
      backgroundColor: theme.palette.primary.main,
    },
  }));

  const handlePopoverOpen1 = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorE1(event.currentTarget);
  };

  const handlePopoverClose1 = () => {
    setAnchorE1(null);
  };

  const handlePopoverOpen2 = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorE2(event.currentTarget);
  };

  const handlePopoverClose2 = () => {
    setAnchorE2(null);
  };

  const handlePopoverOpen3 = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorE3(event.currentTarget);
  };

  const handlePopoverClose3 = () => {
    setAnchorE3(null);
  };

  const handlePopoverOpen4 = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorE4(event.currentTarget);
  };

  const handlePopoverClose4 = () => {
    setAnchorE4(null);
  };

  const open1 = Boolean(anchorE1);
  const open2 = Boolean(anchorE2);
  const open3 = Boolean(anchorE3);
  const open4 = Boolean(anchorE4);

  return (
    <nav className="navbar">
      <div className="container2">
        <Row className='rowNav'>
          <Col xs={16} sm={8} md={4} lg={8} style={{ paddingRight: 20, paddingTop: 46, paddingLeft: 35, paddingBottom: 20, height: 120 }}>
            <FlexLogo src={logo} alt='Logo' />
          </Col>
          <Col xs={16} sm={8} md={4} lg={8} style={{ paddingRight: 20, paddingTop: 50, paddingLeft: 20, paddingBottom: 20, height: 120 }}>
            <ColorButton><b><h6>Déposer une annonce</h6></b></ColorButton>
          </Col>
          <Col xs={16} sm={8} md={4} lg={8} style={{ paddingRight: 20, paddingLeft: 20, paddingTop: 50, paddingBottom: 20, height: 120 }}>
            <SearchField onSearch={(query: string) => console.log('Search ', query)} />
          </Col>
          <Col xs={16} sm={8} md={4} lg={8} style={{ paddingRight: 20, paddingLeft: 20, paddingTop: 30, paddingBottom: 20, height: 120 }}>
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
      <br />
      <div className="container">
        <div className={`nav-elements  ${showNavbar && 'active'}`}>
          <ul>
            <li>
              <NavLink to="/">
                <Typography
                  aria-owns={open1 ? 'mouse-over-popover1' : undefined}
                  aria-haspopup="true"
                  onMouseEnter={handlePopoverOpen1}
                  onMouseLeave={handlePopoverClose1}
                >
                  nos métiers/services
                </Typography>
                <Popover
                  id="mouse-over-popover1"
                  sx={{
                    pointerEvents: 'none',
                  }}
                  open={open1}
                  anchorEl={anchorE1}
                  anchorOrigin={{
                    vertical: 'bottom',
                    horizontal: 'left',
                  }}
                  transformOrigin={{
                    vertical: 'top',
                    horizontal: 'left',
                  }}
                  onClose={handlePopoverClose1}
                  disableRestoreFocus
                >
                  <Typography sx={{ p: 1 }}>techniques et artisanaux</Typography>
                  <Typography sx={{ p: 1 }}>immobilier neuf</Typography>
                  <Typography sx={{ p: 1 }}>per</Typography>
                  <Typography sx={{ p: 1 }}>collocation</Typography>
                  <Typography sx={{ p: 1 }}>bureau et commerce</Typography>
                </Popover>
              </NavLink>
            </li>

            <li>
              <NavLink to="/Reservations">
                <Typography
                  aria-owns={open2 ? 'mouse-over-popover2' : undefined}
                  aria-haspopup="true"
                  onMouseEnter={handlePopoverOpen2}
                  onMouseLeave={handlePopoverClose2}
                >
                  freelance/corporate
                </Typography>
                <Popover
                  id="mouse-over-popover2"
                  sx={{
                    pointerEvents: 'none',
                  }}
                  open={open2}
                  anchorEl={anchorE2}
                  anchorOrigin={{
                    vertical: 'bottom',
                    horizontal: 'left',
                  }}
                  transformOrigin={{
                    vertical: 'top',
                    horizontal: 'left',
                  }}
                  onClose={handlePopoverClose2}
                  disableRestoreFocus
                >
                  <Typography sx={{ p: 1 }}>I use Popover.</Typography>
                </Popover>
              </NavLink>
            </li>

            <li>
              <NavLink to="/Services">
                <Typography
                  aria-owns={open3 ? 'mouse-over-popover3' : undefined}
                  aria-haspopup="true"
                  onMouseEnter={handlePopoverOpen3}
                  onMouseLeave={handlePopoverClose3}
                >
                  E-marché
                </Typography>
                <Popover
                  id="mouse-over-popover3"
                  sx={{
                    pointerEvents: 'none',
                  }}
                  open={open3}
                  anchorEl={anchorE3}
                  anchorOrigin={{
                    vertical: 'bottom',
                    horizontal: 'left',
                  }}
                  transformOrigin={{
                    vertical: 'top',
                    horizontal: 'left',
                  }}
                  onClose={handlePopoverClose3}
                  disableRestoreFocus
                >
                  <Typography sx={{ p: 1 }}>I use Popover.</Typography>
                </Popover>
              </NavLink>
            </li>

            <li>
              <NavLink to="/Apropos">
                <Typography
                  aria-owns={open4 ? 'mouse-over-popover4' : undefined}
                  aria-haspopup="true"
                  onMouseEnter={handlePopoverOpen4}
                  onMouseLeave={handlePopoverClose4}
                >
                  Autre
                </Typography>
                <Popover
                  id="mouse-over-popover4"
                  sx={{
                    pointerEvents: 'none',
                  }}
                  open={open4}
                  anchorEl={anchorE4}
                  anchorOrigin={{
                    vertical: 'bottom',
                    horizontal: 'left',
                  }}
                  transformOrigin={{
                    vertical: 'top',
                    horizontal: 'left',
                  }}
                  onClose={handlePopoverClose4}
                  disableRestoreFocus
                >
                  <Typography sx={{ p: 1 }}>I use Popover.</Typography>
                </Popover>
              </NavLink>
            </li>
          </ul>
        </div>
        <br />
      </div>
    </nav>
  );
};

export default Navbar;
