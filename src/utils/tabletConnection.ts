export function tabletAddress(text:string):string {
  const url=new URL(text);
  const host=url.hostname.toLowerCase(),parts=host.split('.').map(Number);
  const ipv4=parts.length===4 && parts.every(n=>Number.isInteger(n)&&n>=0&&n<=255);
  const local=host==='localhost' || /^[a-z0-9-]+\.local$/.test(host) || ipv4 && (parts[0]===10 || parts[0]===127 || parts[0]===192&&parts[1]===168 || parts[0]===172&&parts[1]>=16&&parts[1]<=31);
  if(url.protocol!=='https:' || url.username || url.password || !local)throw new Error('Use the local HTTPS address shown in PraiseAV → Remote.');
  return url.origin;
}
