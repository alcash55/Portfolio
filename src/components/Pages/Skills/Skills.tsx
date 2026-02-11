import { useTheme } from "@emotion/react";
import { Stack, Card, CardHeader, IconButton, CardContent, Grid, Chip } from "@mui/material";
import LinkIcon from "@mui/icons-material/Link";


const Skills = () => {
    const theme = useTheme();
    const skills = {
        Languages: ["TypeScript", "JavaScript", "Go"],
        Frameworks: ["React", "Node.js", "Bun", "Express", "Next.js"],
        Tools: ["Docker", "Git", "GitHub"],
    };

    return (
        <Stack id="skills" component={"section"}>
            <Card
                sx={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    height: "100%",
                    width: "100%",
                    p: 0,
                    m: 0,
                }}
            >
                <CardHeader
                    sx={{
                        width: "100%",
                    }}
                    titleTypographyProps={{
                        textAlign: "start",
                        variant: "h4",
                        component: "h1",
                    }}
                    avatar={
                        <IconButton
                            aria-label="navigate to skills & tech"
                            href="#skills"
                            sx={{ zIndex: 0 }}
                        >
                            <LinkIcon />
                        </IconButton>
                    }
                    title="Skills & Tech"
                />
                <CardContent
                    sx={{
                        width: "100%",
                        height: "100%",
                        display: "flex",
                        justifyContent: "space-evenly",
                        alignItems: "center",
                        flexGrow: 1,
                        gap: 3
                    }}
                >
                    <Card sx={{
                        width: '100%',
                        height: '25%',
                        backgroundColor: '#18181b',
                        border: '2px solid #27272a',
                        transition: 'all 0.3s ease',
                        '&:hover': {
                            boxShadow: ' 0px 25px 20px -20px rgb(18, 72, 116)',
                        },
                    }}>
                        <CardHeader
                            title="Languages"
                        />
                        <CardContent sx={{ display: "flex", gap: 1 }}>
                            {skills.Languages.map((language) => (
                                <Chip key={language} label={language} />
                            ))}
                        </CardContent>
                    </Card>
                    <Card sx={{
                        width: '100%',
                        height: '25%',
                        backgroundColor: '#18181b',
                        border: '2px solid #27272a',
                        transition: 'all 0.3s ease',
                        '&:hover': {
                            boxShadow: ' 0px 25px 20px -20px rgb(18, 72, 116)',
                        },
                    }}>
                        <CardHeader
                            title="Frameworks"
                        />
                        <CardContent sx={{ display: "flex", gap: 1 }}>
                            {skills.Frameworks.map((framework) => (
                                <Chip key={framework} label={framework} />
                            ))}
                        </CardContent>
                    </Card>
                    <Card sx={{
                        width: '100%',
                        height: '25%',
                        backgroundColor: '#18181b',
                        border: '2px solid #27272a',
                        transition: 'all 0.3s ease',
                        '&:hover': {
                            boxShadow: ' 0px 25px 20px -20px rgb(18, 72, 116)',
                        },
                    }}>
                        <CardHeader
                            title="Tools"
                        />
                        <CardContent sx={{ display: "flex", gap: 1 }}>
                            {skills.Tools.map((tool) => (
                                <Chip key={tool} label={tool} />
                            ))}
                        </CardContent>
                    </Card>
                </CardContent>
            </Card>
        </Stack>
    );
};

export default Skills;