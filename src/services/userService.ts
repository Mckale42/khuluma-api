/** Get-or-create the learner document for the authenticated Firebase user. */
import { User } from '../models/User';

export async function ensureUser(userId: string, name?: string, email?: string) {
  let user = await User.findOne({ userId });
  if (!user) {
    user = await User.create({ userId, displayName: name || 'Learner', email: email || '' });
  }
  return user;
}
