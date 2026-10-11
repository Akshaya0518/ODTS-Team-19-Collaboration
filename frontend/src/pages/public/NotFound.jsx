import { Link } from 'react-router-dom';
import { EmptyState } from '../../components/ui';

export default function NotFound() {
  return (
    <EmptyState
      icon="🧭"
      title="Page not found"
      action={
        <Link to="/" className="btn btn-primary">
          Go home
        </Link>
      }
    >
      The page you are looking for does not exist.
    </EmptyState>
  );
}
