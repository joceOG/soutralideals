import React from 'react';
import Box from '@mui/material/Box';
import Drawer from '@mui/material/Drawer';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Logo from '../assets/logo.png';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import MenuIcon from '@mui/icons-material/Menu'; 
import { Link as RouterLink } from 'react-router-dom';
import Link from '@mui/material/Link';

const AppDrawer: React.FC = () => {
  const [open, setOpen] = React.useState(false);
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const [menuType, setMenuType] = React.useState<string | null>(null);

  const toggleDrawer = (newOpen: boolean) => () => {
    setOpen(newOpen);
  };

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>, type: string) => {
    setAnchorEl(event.currentTarget);
    setMenuType(type);
  };

  const handleClose = () => {
    setAnchorEl(null);
    setMenuType(null);
  };

  const renderMenuItems = (type: string) => {
    switch (type) {
      case 'utilisateurs':
        return (
          <>
            <MenuItem onClick={handleClose}>
              <Link component={RouterLink} to="/UserList" underline="none">Liste des utilisateurs</Link>
            </MenuItem>
            <MenuItem onClick={handleClose}>
              <Link component={RouterLink} to="/UserForm" underline="none">Créer un nouvel utilisateur</Link>
            </MenuItem>
          </>
        );
      case 'metiers':
        return (
          <>
            <MenuItem onClick={handleClose}>
              <Link component={RouterLink} to="/MetierList" underline="none">Liste des métiers</Link>
            </MenuItem>
            <MenuItem onClick={handleClose}>
              <Link component={RouterLink} to="/MetierForm" underline="none">Ajouter un métier</Link>
            </MenuItem>
          </>
        );
      case 'groupeMetiers':
        return (
          <>
            <MenuItem onClick={handleClose}>
              <Link component={RouterLink} to="/GroupeMetierList" underline="none">Liste des groupes de métiers</Link>
            </MenuItem>
            <MenuItem onClick={handleClose}>
              <Link component={RouterLink} to="/GroupeMetierForm" underline="none">Ajouter un groupe de métiers</Link>
            </MenuItem>
          </>
        );
      case 'categories':
        return (
          <>
            <MenuItem onClick={handleClose}>
              <Link component={RouterLink} to="/CategorieList" underline="none">Liste des catégories</Link>
            </MenuItem>
            <MenuItem onClick={handleClose}>
              <Link component={RouterLink} to="/CategorieForm" underline="none">Ajouter une nouvelle catégorie</Link>
            </MenuItem>
          </>
        );
      default:
        return null;
    }
  };

  const DrawerList = (
    <Box sx={{ width: 250 }} role="presentation">
      <img src={Logo} alt="Logo" style={{ width: '180px', margin: '20px auto', display: 'block' }} />
      <Divider />
      <List>
        {['utilisateurs', 'metiers', 'groupeMetiers', 'categories'].map((text) => (
          <ListItem key={text} disablePadding>
            <Button
              id={`${text}-button`}
              aria-controls={menuType === text ? `${text}-menu` : undefined}
              aria-haspopup="true"
              aria-expanded={menuType === text ? 'true' : undefined}
              onClick={(event) => handleClick(event, text)}
              fullWidth
            >
              {text.charAt(0).toUpperCase() + text.slice(1)}
            </Button>
            <Menu
              id={`${text}-menu`}
              anchorEl={anchorEl}
              open={menuType === text && Boolean(anchorEl)}
              onClose={handleClose}
              MenuListProps={{
                'aria-labelledby': `${text}-button`,
              }}
            >
              {renderMenuItems(text)}
            </Menu>
          </ListItem>
        ))}
      </List>
      <Divider />
      <Box sx={{ textAlign: 'center', marginTop: 'auto', padding: '20px 0' }}>
        <Button variant="text">Se déconnecter</Button>
      </Box>
    </Box>
  );

  return (
    <div>
      <Button onClick={toggleDrawer(true)}>
        <MenuIcon />
      </Button>
      <Drawer open={open} onClose={toggleDrawer(false)}>
        {DrawerList}
      </Drawer>
    </div>
  );
}

export default AppDrawer;
