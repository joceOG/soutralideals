import React from 'react';
import Box from '@mui/material/Box';
import AppDrawer from '../components/Drawer';



const Dashboard: React.FC = () => {


    return (
        <div>
            <AppDrawer></AppDrawer>
            <Box>
                <h1>BIENVENU SUR LE DASHBOARD DE SOUTRALIDEALS</h1>
            </Box>
        </div>

    );
}

export default Dashboard;
