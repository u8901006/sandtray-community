                                                                                                                     
                                                                                                                       
                                                                                                                        
const raw=process.env.E2E_TIME_SCALE??'1';
export const timeScale=Number(raw);
if(!Number.isFinite(timeScale)||timeScale<1||timeScale>5)throw new Error(`E2E_TIME_SCALE must be a number from 1 to 5, got ${JSON.stringify(raw)}`);
export const budget=(ms:number)=>Math.round(ms*timeScale);
