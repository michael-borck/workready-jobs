# workready-jobs

A web application that matches job seekers with employment opportunities based on skills and qualifications. Workready-jobs streamlines the job search and hiring process by intelligently connecting candidates with suitable positions.

## Table of Contents

- [Features](#features)
- [Installation](#installation)
- [Usage](#usage)
- [Configuration](#configuration)
- [Development](#development)
- [Project Structure](#project-structure)
- [License](#license)

## Features

- **Skill-Based Matching**: Advanced algorithm matches job seekers with opportunities based on their skills and qualifications
- **User-Friendly Interface**: Clean, intuitive web interface for both job seekers and employers
- **Job Portal**: Comprehensive job listing and application platform
- **Recruitment Tools**: Streamlined tools for employers to post and manage job listings
- **Real-Time Updates**: Dynamic job matching and application tracking

## Installation

### Prerequisites

- Node.js and npm
- Python 3.x (for build tools)
- Git

### Steps

1. Clone the repository:
```bash
git clone https://github.com/michael-borck/workready-jobs.git
cd workready-jobs
```

2. Install dependencies:
```bash
npm install
```

3. Build the project:
```bash
python build.py
```

4. The application will be available in the `dist/` directory

## Usage

### Starting the Application

To run the application, serve the files from the `dist/` directory:

```bash
# Using Python's built-in server
python -m http.server 8000

# Using Node.js http-server
npx http-server dist
```

Then open your browser and navigate to `http://localhost:8000`

### For Job Seekers

1. Browse available job listings
2. Enter your skills and qualifications
3. Receive personalized job matches
4. Apply to positions that align with your profile

### For Employers

1. Post new job listings
2. Specify required skills and qualifications
3. Review matched candidates
4. Manage applications and hiring pipeline

## Configuration

Configuration settings can be modified in `dist/config.js`. Key settings include:

- API endpoints
- Matching algorithm parameters
- Application preferences
- UI customization options

Review `dist/config.js` for detailed configuration options.

## Development

### Project Structure

```
workready-jobs/
├── src/                    # Source files
│   └── app.js             # Main application logic
├── dist/                  # Compiled distribution files
│   ├── index.html         # Main HTML file
│   ├── app.js             # Compiled application
│   ├── config.js          # Configuration file
│   ├── style.css          # Styles
│   └── favicon.svg        # Favicon
├── .github/
│   └── workflows/         # GitHub Actions workflows
│       └── pages.yml      # GitHub Pages deployment
├── build.py               # Build script
├── .gitignore             # Git ignore rules
└── LICENSE                # MIT License

```

### Building

To build the project from source:

```bash
python build.py
```

This will compile the source files and output them to the `dist/` directory.

### Running Tests

Ensure code quality and functionality:

```bash
npm test
```

### Deployment

The project includes GitHub Actions workflows for automated deployment to GitHub Pages. Updates pushed to the main branch will automatically deploy to the live site.

## Contributing

Contributions are welcome! Please feel free to submit pull requests or open issues for bugs and feature requests.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

For more information and updates, visit the [GitHub repository](https://github.com/michael-borck/workready-jobs).