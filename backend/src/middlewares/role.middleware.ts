import { Response, NextFunction } from 'express';
import { AuthenticatedRequest, UserRole } from '../types';

export const requireRole = (allowedRoles: UserRole[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized. User authentication required.' });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        error: `Forbidden. Role '${req.user.role}' does not have sufficient permission for this resource.`,
      });
      return;
    }

    next();
  };
};

