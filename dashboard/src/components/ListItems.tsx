
import * as React from 'react';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import PeopleIcon from '@mui/icons-material/People';
import GroupIcon from '@mui/icons-material/Group';
import CategoryIcon from '@mui/icons-material/Category';
import DesignServicesIcon from '@mui/icons-material/DesignServices';
import CoPresentIcon from '@mui/icons-material/CoPresent';
import { Link } from 'react-router-dom';

export const mainListItems = (
  <React.Fragment>
    <ListItemButton component={Link} to="/groupe">
      <ListItemIcon>
        <GroupIcon />
      </ListItemIcon>
      <ListItemText primary="Groupe" />
    </ListItemButton>
    <ListItemButton component={Link} to="/categorie">
      <ListItemIcon>
        <CategoryIcon />
      </ListItemIcon>
      <ListItemText primary="Catégorie" />
    </ListItemButton>
    <ListItemButton component={Link} to="/service">
      <ListItemIcon >
        <DesignServicesIcon />
      </ListItemIcon>
      <ListItemText primary="Service" />
    </ListItemButton>
    <ListItemButton component={Link} to="/article">
      <ListItemIcon>
        <ShoppingCartIcon />
      </ListItemIcon>
      <ListItemText primary="Article" />
    </ListItemButton>
    <ListItemButton component={Link} to="/utilisateur">
      <ListItemIcon>
        <PeopleIcon />
      </ListItemIcon>
      <ListItemText primary="Utilisateur" />
    </ListItemButton>
    <ListItemButton component={Link} to="/prestataire">
      <ListItemIcon >
        < CoPresentIcon />
      </ListItemIcon>
      <ListItemText primary="Prestataire" />
    </ListItemButton>
    
  </React.Fragment>
);
