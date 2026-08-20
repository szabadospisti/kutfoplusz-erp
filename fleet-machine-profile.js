/* Kútfő Plusz ERP – Géppark régi adatlap kompatibilitási réteg
 * A korábbi modalos gépadlap-modult letiltottuk.
 * A jelenlegi Géppark adatlapot a machine-profile-native.js kezeli,
 * a szerkesztést pedig a machine-profile-edit-inline.js.
 */
(function(){
  'use strict';
  window.__legacyFleetMachineProfileDisabled=true;
})();
