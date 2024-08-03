import React, { useState } from 'react';
import Popover from '@mui/material/Popover';
import Typography from '@mui/material/Typography';

// Composant Dashboard
const Dashboard: React.FC = () => {
    const [anchorE1, setAnchorE1] = useState<HTMLElement | null>(null);
    const [anchorE2, setAnchorE2] = useState<HTMLElement | null>(null);
    const [anchorE3, setAnchorE3] = useState<HTMLElement | null>(null);
    const [anchorE4, setAnchorE4] = useState<HTMLElement | null>(null);

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
        <nav>
            <div>
                <Typography
                    aria-owns={open1 ? 'mouse-over-popover' : undefined}
                    aria-haspopup="true"
                    onMouseEnter={handlePopoverOpen1}
                    onMouseLeave={handlePopoverClose1}
                >
                    Type d’utilisateur
                </Typography>
                <Popover
                    id="mouse-over-popover"
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
                    <Typography sx={{ p: 1 }}>create</Typography>
                    <Typography sx={{ p: 1 }}>read</Typography>
                    <Typography sx={{ p: 1 }}>update</Typography>
                    <Typography sx={{ p: 1 }}>delete</Typography>
                </Popover>
            </div>

            <div>
                <Typography
                    aria-owns={open2 ? 'mouse-over-popover' : undefined}
                    aria-haspopup="true"
                    onMouseEnter={handlePopoverOpen2}
                    onMouseLeave={handlePopoverClose2}
                >
                    métiers
                </Typography>
                <Popover
                    id="mouse-over-popover"
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
                    <Typography sx={{ p: 1 }}>create</Typography>
                    <Typography sx={{ p: 1 }}>read</Typography>
                    <Typography sx={{ p: 1 }}>update</Typography>
                    <Typography sx={{ p: 1 }}>delete</Typography>
                </Popover>
            </div>

            <div>
                <Typography
                    aria-owns={open3 ? 'mouse-over-popover' : undefined}
                    aria-haspopup="true"
                    onMouseEnter={handlePopoverOpen3}
                    onMouseLeave={handlePopoverClose3}
                >
                    groupe de métiers
                </Typography>
                <Popover
                    id="mouse-over-popover"
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
                    <Typography sx={{ p: 1 }}>create</Typography>
                    <Typography sx={{ p: 1 }}>read</Typography>
                    <Typography sx={{ p: 1 }}>update</Typography>
                    <Typography sx={{ p: 1 }}>delete</Typography>
                </Popover>
            </div>

            <div>
                <Typography
                    aria-owns={open4 ? 'mouse-over-popover' : undefined}
                    aria-haspopup="true"
                    onMouseEnter={handlePopoverOpen4}
                    onMouseLeave={handlePopoverClose4}
                >
                    catégories
                </Typography>
                <Popover
                    id="mouse-over-popover"
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
                    <Typography sx={{ p: 1 }}>create</Typography>
                    <Typography sx={{ p: 1 }}>read</Typography>
                    <Typography sx={{ p: 1 }}>update</Typography>
                    <Typography sx={{ p: 1 }}>delete</Typography>
                </Popover>
            </div>
        </nav>
    );
};

export default Dashboard;
