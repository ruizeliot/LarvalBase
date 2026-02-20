import { Routes, Route } from 'react-router-dom';
import { ProjectsPage } from '@/components/projects/ProjectsPage';

function App() {
  return (
    <div className="app">
      <Routes>
        <Route path="/" element={<ProjectsPage />} />
      </Routes>
    </div>
  );
}

export default App;
