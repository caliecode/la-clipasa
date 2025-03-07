import classes from './FallbackLoading.module.css'

export const RouteLoading = ({ children }: { children: React.ReactNode }) => {
  return <div className={classes.routeLoading}>{children}</div>
}
