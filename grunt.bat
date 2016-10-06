@echo off
 set /p t=grunt task name:
 set /p p=server port:
 call "f:\svn\feteam\grunt.cmd" server:%t% --base="f:\svn\feteam\node_modules\grunt" --nodepath="f:\svn\feteam\node_modules" --port=%p%
 pause