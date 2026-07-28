"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IssueTypeName = exports.IssueStatus = exports.IssueType = void 0;
var IssueType;
(function (IssueType) {
    IssueType[IssueType["VIDEO"] = 1] = "VIDEO";
    IssueType[IssueType["AUDIO"] = 2] = "AUDIO";
    IssueType[IssueType["SUBTITLES"] = 3] = "SUBTITLES";
    IssueType[IssueType["OTHER"] = 4] = "OTHER";
})(IssueType || (exports.IssueType = IssueType = {}));
var IssueStatus;
(function (IssueStatus) {
    IssueStatus[IssueStatus["OPEN"] = 1] = "OPEN";
    IssueStatus[IssueStatus["RESOLVED"] = 2] = "RESOLVED";
})(IssueStatus || (exports.IssueStatus = IssueStatus = {}));
exports.IssueTypeName = {
    [IssueType.AUDIO]: 'Audio',
    [IssueType.VIDEO]: 'Video',
    [IssueType.SUBTITLES]: 'Subtitle',
    [IssueType.OTHER]: 'Other',
};
