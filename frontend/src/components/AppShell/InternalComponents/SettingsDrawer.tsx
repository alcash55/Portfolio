import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Drawer,
  IconButton,
  Stack,
  Typography,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import Close from '@mui/icons-material/Close';
import { ThemeButton } from './ThemeButton';
import { LayoutButton } from './LayoutButton';

interface SettingsDrawerProps {
  settingDrawer: boolean;
  setSettingDrawer: (value: boolean) => void;
}

export const SettingsDrawer = ({ settingDrawer, setSettingDrawer }: SettingsDrawerProps) => {
  const theme = useTheme();
  const tempSidebar = useMediaQuery(theme.breakpoints.down(2561));
  const isMobile = useMediaQuery(theme.breakpoints.down(426));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));
  const showLayout = useMediaQuery(theme.breakpoints.down(650));

  const SettingDrawerTopItem = () => (
    <Stack
      direction={'row'}
      sx={{
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
      }}
    >
      <Box
        sx={{
          width: '100%',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          ml: 4,
        }}
      >
        <Typography variant="h6" component={'h2'} id="settings-drawer-title">
          Settings
        </Typography>
      </Box>
      <IconButton aria-label="Close Settings Drawer" onClick={() => setSettingDrawer(false)}>
        <Close />
      </IconButton>
    </Stack>
  );

  const SettingDrawerBottomItem = () => (
    <Stack
      direction={'row'}
      sx={{
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
      }}
    >
      Insert Logo/Brand
    </Stack>
  );

  const SettingDrawerContent = () => (
    <Stack
      spacing={2}
      sx={{
        justifyContent: 'flex-start',
        alignItems: 'center',
        width: '100%',
        height: '100%',
      }}
    >
      <Card sx={{ width: '100%' }}>
        {/* Drawer's own title above is h2; these are its subsections, so h3
            keeps the heading outline skip-free. Default CardHeader renders
            the title as a plain <span>, which drops it from the
            accessibility tree entirely. */}
        <CardHeader
          title="Select a Theme"
          slotProps={{
            title: { variant: 'h5', component: 'h3' },
          }}
        />
        <CardContent>
          <ThemeButton />
        </CardContent>
      </Card>
      {!showLayout && (
        <Card sx={{ width: '100%' }}>
          <CardHeader
            title="Select a Layout"
            slotProps={{
              title: { variant: 'h5', component: 'h3' },
            }}
          />
          <CardContent>
            <LayoutButton />
          </CardContent>
        </Card>
      )}
    </Stack>
  );

  return (
    <Drawer
      anchor={'right'}
      open={settingDrawer}
      onClose={() => setSettingDrawer(false)}
      role="dialog"
      aria-labelledby="settings-drawer-title"
      slotProps={{
        paper: {
          sx: {
            width: isMobile ? '100%' : isTablet ? '50%' : tempSidebar ? 280 : 280,
          },
        },
      }}
    >
      <Stack
        spacing={2}
        sx={{
          justifyContent: 'center',
          alignItems: 'center',
          px: 2,
          py: 2,
          height: '100%',
        }}
      >
        <SettingDrawerTopItem />
        <SettingDrawerContent />
        <SettingDrawerBottomItem />
      </Stack>
    </Drawer>
  );
};
