import { Link } from "react-router-dom";
import {
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  Box,
} from "@mui/material";
import { usePluginContext } from "./PluginContext";

export default function Home() {
  const { homeItems } = usePluginContext();

  return (
    <Box sx={{ padding: "2rem" }}>
      <Typography variant="h3" gutterBottom>
        Welcome to AiiDA
      </Typography>
      <Typography variant="body1" component="p" sx={{ mb: 2 }}>
        AiiDA is an open-source Python infrastructure to help researchers with
        automating, managing, persisting, sharing and reproducing the complex
        workflows associated with modern computational science and all
        associated data.
      </Typography>

      <Grid container spacing={2} sx={{ marginTop: "1rem" }}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Typography variant="h5" gutterBottom>
                Application Sections
              </Typography>
              <Button
                component={Link}
                to="/process"
                variant="contained"
                color="primary"
                sx={{ margin: "0.5rem", textTransform: "none" }}
              >
                Process Table
              </Button>
              <Button
                component={Link}
                to="/datanode"
                variant="contained"
                color="primary"
                sx={{ margin: "0.5rem", textTransform: "none" }}
              >
                Data Table
              </Button>
              <Button
                component={Link}
                to="/groupnode"
                variant="contained"
                color="primary"
                sx={{ margin: "0.5rem", textTransform: "none" }}
              >
                Group Table
              </Button>
              <Button
                component={Link}
                to="/daemon"
                variant="contained"
                color="primary"
                sx={{ margin: "0.5rem", textTransform: "none" }}
              >
                Daemon
              </Button>
              {Object.entries(homeItems).map(([name, item]) => (
                <Button
                  key={name}
                  component={Link}
                  to={item.path}
                  variant="contained"
                  color="primary"
                  sx={{ margin: "0.5rem", textTransform: "none" }}
                >
                  {item.label}
                </Button>
              ))}
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Typography variant="h5" gutterBottom>
                External Resources
              </Typography>
              <Button
                href="https://www.aiida.net/sections/about.html"
                target="_blank"
                variant="outlined"
                color="secondary"
                sx={{ margin: "0.5rem", textTransform: "none" }}
              >
                Documentation
              </Button>
              <Button
                href="https://github.com/aiidateam/aiida-core"
                target="_blank"
                variant="outlined"
                color="secondary"
                sx={{ margin: "0.5rem", textTransform: "none" }}
              >
                GitHub Repository
              </Button>
              <Button
                href="https://aiida.discourse.group/"
                target="_blank"
                variant="outlined"
                color="secondary"
                sx={{ margin: "0.5rem", textTransform: "none" }}
              >
                AiiDA Community Forum
              </Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
