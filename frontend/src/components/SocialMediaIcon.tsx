import * as React from "react";
import Stack from "@mui/material/Stack";
import { Container } from "@mui/material";
import InstagramIcon from "@mui/icons-material/Instagram";
import YouTubeIcon from "@mui/icons-material/YouTube";
import FacebookIcon from "@mui/icons-material/Facebook";
import TwitterIcon from "@mui/icons-material/Twitter";
import PinterestIcon from "@mui/icons-material/Pinterest";
import LinkedInIcon from "@mui/icons-material/LinkedIn";

import Link from '@mui/material/Link';



const SocialMediaIcon: React.FC = () => {

    return (
        <Container maxWidth="md" sx={{ mt: 20 }}>
            <Stack direction="row" alignItems="center" spacing={4}>

                <Link
                    component="button"
                    variant="body2"
                    onClick={() => {
                        console.info("I'm a button.");
                    }}
                >
                    <InstagramIcon fontSize="large" sx={{ color: "#E1306C" }} />
                </Link>

                <Link
                    component="button"
                    variant="body2"
                    onClick={() => {
                        console.info("I'm a button.");
                    }}
                >
                    <YouTubeIcon fontSize="large" sx={{ color: "#FF0000" }} />
                </Link>

                <Link
                    component="button"
                    variant="body2"
                    onClick={() => {
                        console.info("I'm a button.");
                    }}
                >
                    <FacebookIcon color="primary" fontSize="large" />
                </Link>

                <Link
                    component="button"
                    variant="body2"
                    onClick={() => {
                        console.info("I'm a button.");
                    }}
                >
                    <TwitterIcon fontSize="large" sx={{ color: "#1DA1F2" }} />
                </Link>

                <Link
                    component="button"
                    variant="body2"
                    onClick={() => {
                        console.info("I'm a button.");
                    }}
                >
                    <PinterestIcon fontSize="large" sx={{ color: "#E60023" }} />
                </Link>

                <Link
                    component="button"
                    variant="body2"
                    onClick={() => {
                        console.info("I'm a button.");
                    }}
                >
                    <LinkedInIcon fontSize="large" color="primary" />
                </Link>
            </Stack>
        </Container>
    );
};

export default SocialMediaIcon;